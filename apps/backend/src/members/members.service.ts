import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AddMemberInput, Member, MembersResponse } from "@portfolio/contracts";
import { AccessService } from "../auth/access.service";
import { isUniqueViolation } from "../prisma/errors";
import { PrismaService } from "../prisma/prisma.service";
import { findGithubUser } from "./github";

const GITHUB = "github";

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(): Promise<MembersResponse> {
    const members = await this.prisma.client.member.findMany({ orderBy: { createdAt: "asc" } });
    // Members are keyed by GitHub ID, so join to users through their GitHub accounts.
    const accounts = await this.prisma.client.account.findMany({
      where: { providerId: GITHUB, accountId: { in: members.map(({ githubId }) => githubId) } },
      select: { accountId: true, user: { select: { name: true, image: true } } },
    });
    const users = new Map(accounts.map(({ accountId, user }) => [accountId, user]));
    return {
      members: members.map(({ id, githubId, githubLogin, createdAt }) =>
        toMember({ id, githubLogin, createdAt, user: users.get(githubId) ?? null }),
      ),
    };
  }

  /** Lets a GitHub account sign in, whether or not it has signed in before. */
  async add(addedById: string, input: AddMemberInput): Promise<Member> {
    const githubUser = await findGithubUser(input.githubLogin);
    if (!githubUser)
      throw new BadRequestException(`GitHub user "${input.githubLogin}" doesn't exist`);

    try {
      const member = await this.prisma.client.member.create({
        data: { githubId: githubUser.id, githubLogin: githubUser.login, addedById },
      });
      const account = await this.prisma.client.account.findFirst({
        where: { providerId: GITHUB, accountId: githubUser.id },
        select: { user: { select: { name: true, image: true } } },
      });
      return toMember({ ...member, user: account?.user ?? null });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException(`${githubUser.login} is already a member`);
      throw error;
    }
  }

  /** Also signs them out everywhere (they can't sign back in), unless they're an admin. */
  async remove(memberId: string): Promise<void> {
    const member = await this.prisma.client.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException();
    await this.prisma.client.member.delete({ where: { id: memberId } });

    if (this.access.isAdminGithubId(member.githubId)) return;
    await this.prisma.client.session.deleteMany({
      where: { user: { accounts: { some: { providerId: GITHUB, accountId: member.githubId } } } },
    });
  }
}

function toMember({
  id,
  githubLogin,
  createdAt,
  user,
}: {
  id: string;
  githubLogin: string;
  createdAt: Date;
  user: { name: string; image: string | null } | null;
}): Member {
  return { id, githubLogin, createdAt: createdAt.toISOString(), user };
}
