import { Inject, Injectable } from "@nestjs/common";
import { ENV, type Env } from "../env";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AccessService {
  private readonly adminIds: ReadonlySet<string>;

  constructor(
    @Inject(ENV) env: Env,
    private readonly prisma: PrismaService,
  ) {
    this.adminIds = new Set(env.ADMIN_GITHUB_IDS);
  }

  isAdminGithubId(githubId: string): boolean {
    return this.adminIds.has(githubId);
  }

  /** Whether the user is an admin, and whether they're on the members list. */
  async load(userId: string): Promise<{ isAdmin: boolean; isMember: boolean }> {
    const accounts = await this.prisma.client.account.findMany({
      where: { userId, providerId: "github" },
      select: { accountId: true },
    });
    const githubIds = accounts.map(({ accountId }) => accountId);
    const isAdmin = githubIds.some((id) => this.adminIds.has(id));
    const isMember =
      githubIds.length > 0 &&
      (await this.prisma.client.member.count({ where: { githubId: { in: githubIds } } })) > 0;
    return { isAdmin, isMember };
  }
}
