import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  InviteMemberInput,
  InviteResult,
  MembersResponse,
  SiteRole,
} from "@portfolio/contracts";
import { AccessService } from "../auth/access.service";
import { PrismaService } from "../prisma/prisma.service";
import { findGithubUser } from "./github";

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(siteId: string): Promise<MembersResponse> {
    const [members, invites] = await Promise.all([
      this.prisma.client.siteMember.findMany({
        where: { siteId },
        include: { user: { select: { name: true, email: true, image: true } } },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.client.siteInvite.findMany({ where: { siteId }, orderBy: { createdAt: "asc" } }),
    ]);
    return {
      members: members.map(({ userId, role, createdAt, user }) => ({
        userId,
        role,
        createdAt: createdAt.toISOString(),
        ...user,
      })),
      invites: invites.map(({ id, githubLogin, role, createdAt }) => ({
        id,
        githubLogin,
        role,
        createdAt: createdAt.toISOString(),
      })),
    };
  }

  /** Adds an existing user directly; otherwise records an invite claimed on their first sign-in. */
  async invite(
    siteId: string,
    invitedById: string,
    input: InviteMemberInput,
  ): Promise<InviteResult> {
    const githubUser = await findGithubUser(input.githubLogin);
    if (!githubUser)
      throw new BadRequestException(`GitHub user "${input.githubLogin}" doesn't exist`);

    const account = await this.prisma.client.account.findFirst({
      where: { providerId: "github", accountId: githubUser.id },
      select: { userId: true },
    });
    if (account) {
      const existing = await this.prisma.client.siteMember.findUnique({
        where: { siteId_userId: { siteId, userId: account.userId } },
      });
      if (existing) throw new ConflictException(`${githubUser.login} is already a member`);
      await this.prisma.client.siteMember.create({
        data: { siteId, userId: account.userId, role: input.role },
      });
      return { status: "added" };
    }

    await this.prisma.client.siteInvite.upsert({
      where: { siteId_githubId: { siteId, githubId: githubUser.id } },
      create: {
        siteId,
        githubId: githubUser.id,
        githubLogin: githubUser.login,
        role: input.role,
        invitedById,
      },
      update: { role: input.role, githubLogin: githubUser.login },
    });
    return { status: "invited" };
  }

  async cancelInvite(siteId: string, inviteId: string): Promise<void> {
    const { count } = await this.prisma.client.siteInvite.deleteMany({
      where: { id: inviteId, siteId },
    });
    if (count === 0) throw new NotFoundException();
  }

  async updateRole(siteId: string, userId: string, role: SiteRole): Promise<void> {
    const member = await this.findMember(siteId, userId);
    if (member.role === "OWNER" && role !== "OWNER") await this.assertNotLastOwner(siteId);
    await this.prisma.client.siteMember.update({
      where: { siteId_userId: { siteId, userId } },
      data: { role },
    });
  }

  /** Removing someone's last membership also signs them out everywhere (they can't sign back in). */
  async remove(siteId: string, userId: string): Promise<void> {
    const member = await this.findMember(siteId, userId);
    if (member.role === "OWNER") await this.assertNotLastOwner(siteId);
    await this.prisma.client.siteMember.delete({ where: { siteId_userId: { siteId, userId } } });

    const { isPlatformAdmin, memberships } = await this.access.load(userId);
    if (!isPlatformAdmin && memberships.size === 0) {
      await this.prisma.client.session.deleteMany({ where: { userId } });
    }
  }

  private async findMember(siteId: string, userId: string) {
    const member = await this.prisma.client.siteMember.findUnique({
      where: { siteId_userId: { siteId, userId } },
    });
    if (!member) throw new NotFoundException();
    return member;
  }

  private async assertNotLastOwner(siteId: string): Promise<void> {
    const owners = await this.prisma.client.siteMember.count({ where: { siteId, role: "OWNER" } });
    if (owners <= 1) throw new ConflictException("A site needs at least one owner");
  }
}
