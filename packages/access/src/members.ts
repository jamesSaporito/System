import { isNotFound, isUniqueViolation, type PrismaClient } from "@portfolio/db";
import type { AccessControl } from "./access";
import type { AddMemberInput, Member, MembersResponse } from "./api/members";
import type { Permission, UpdateMemberPermissionsInput } from "./api/permissions";
import { AccessError } from "./errors";
import { type FetchLike, findGithubUser } from "./github";

const GITHUB = "github";

/** The members list: who besides the admins may sign in, and which tabs they may open. */
export class Members {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly access: AccessControl,
    /** How GitHub is reached to look up usernames; tests pass a fake. */
    private readonly fetch: FetchLike = (url, init) => globalThis.fetch(url, init),
  ) {}

  async list(): Promise<MembersResponse> {
    const members = await this.prisma.member.findMany({ orderBy: { createdAt: "asc" } });
    // Members are keyed by GitHub ID, so join to users through their GitHub accounts.
    const accounts = await this.prisma.account.findMany({
      where: { providerId: GITHUB, accountId: { in: members.map(({ githubId }) => githubId) } },
      select: { accountId: true, user: { select: { name: true, image: true } } },
    });
    const users = new Map(accounts.map(({ accountId, user }) => [accountId, user]));
    return {
      members: members.map((member) =>
        toMember({ ...member, user: users.get(member.githubId) ?? null }),
      ),
    };
  }

  /** Lets a GitHub account sign in, whether or not it has signed in before. */
  async add(addedById: string, input: AddMemberInput): Promise<Member> {
    const githubUser = await findGithubUser(this.fetch, input.githubLogin);
    if (!githubUser) {
      throw new AccessError("invalid", `GitHub user "${input.githubLogin}" doesn't exist`);
    }

    try {
      const member = await this.prisma.member.create({
        data: {
          githubId: githubUser.id,
          githubLogin: githubUser.login,
          permissions: input.permissions,
          addedById,
        },
      });
      const account = await this.prisma.account.findFirst({
        where: { providerId: GITHUB, accountId: githubUser.id },
        select: { user: { select: { name: true, image: true } } },
      });
      return toMember({ ...member, user: account?.user ?? null });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AccessError("conflict", `${githubUser.login} is already a member`);
      }
      throw error;
    }
  }

  /** Takes effect on their next request; the guard reads permissions on every call. */
  async updatePermissions(
    memberId: string,
    { permissions }: UpdateMemberPermissionsInput,
  ): Promise<Member> {
    const member = await this.prisma.member
      .update({ where: { id: memberId }, data: { permissions } })
      .catch((error: unknown) => {
        if (isNotFound(error)) throw new AccessError("not-found");
        throw error;
      });
    const account = await this.prisma.account.findFirst({
      where: { providerId: GITHUB, accountId: member.githubId },
      select: { user: { select: { name: true, image: true } } },
    });
    return toMember({ ...member, user: account?.user ?? null });
  }

  /** Also signs them out everywhere (they can't sign back in), unless they're an admin. */
  async remove(memberId: string): Promise<void> {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new AccessError("not-found");
    await this.prisma.member.delete({ where: { id: memberId } });

    if (this.access.isAdminGithubId(member.githubId)) return;
    await this.prisma.session.deleteMany({
      where: { user: { accounts: { some: { providerId: GITHUB, accountId: member.githubId } } } },
    });
  }
}

function toMember({
  id,
  githubLogin,
  permissions,
  createdAt,
  user,
}: {
  id: string;
  githubLogin: string;
  permissions: Permission[];
  createdAt: Date;
  user: { name: string; image: string | null } | null;
}): Member {
  return { id, githubLogin, permissions, createdAt: createdAt.toISOString(), user };
}
