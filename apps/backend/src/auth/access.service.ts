import { Inject, Injectable } from "@nestjs/common";
import { PERMISSIONS, type Permission } from "@portfolio/contracts";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "node:http";
import { ENV, type Env } from "../env";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthContext } from "./access";
import { AuthService } from "./auth.service";

export type Authorization = { ok: true; auth: AuthContext } | { ok: false; status: 401 | 403 };

@Injectable()
export class AccessService {
  private readonly adminIds: ReadonlySet<string>;

  constructor(
    @Inject(ENV) env: Env,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {
    this.adminIds = new Set(env.ADMIN_GITHUB_IDS);
  }

  isAdminGithubId(githubId: string): boolean {
    return this.adminIds.has(githubId);
  }

  /**
   * The request's session plus what it may open: 401 without a session, 403 for a session that
   * outlived a removed member (sign-in already checks this). Shared by SessionGuard and the
   * middleware in front of Better Auth's session endpoints.
   */
  async authorize(headers: IncomingHttpHeaders): Promise<Authorization> {
    const session = await this.authService.auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });
    if (!session) return { ok: false, status: 401 };

    const { isAdmin, isMember, permissions } = await this.load(session.user.id);
    if (!isAdmin && !isMember) return { ok: false, status: 403 };
    return { ok: true, auth: { ...session, isAdmin, permissions } };
  }

  /** Whether the user is an admin, whether they're on the members list, and their tabs. */
  async load(
    userId: string,
  ): Promise<{ isAdmin: boolean; isMember: boolean; permissions: Permission[] }> {
    const accounts = await this.prisma.client.account.findMany({
      where: { userId, providerId: "github" },
      select: { accountId: true },
    });
    const githubIds = accounts.map(({ accountId }) => accountId);
    const isAdmin = githubIds.some((id) => this.adminIds.has(id));
    const members =
      githubIds.length > 0
        ? await this.prisma.client.member.findMany({
            where: { githubId: { in: githubIds } },
            select: { permissions: true },
          })
        : [];
    const permissions = isAdmin
      ? [...PERMISSIONS]
      : [...new Set(members.flatMap((member) => member.permissions))];
    return { isAdmin, isMember: members.length > 0, permissions };
  }
}
