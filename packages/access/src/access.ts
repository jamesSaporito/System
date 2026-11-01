import type { PrismaClient } from "@portfolio/db";
import { PERMISSIONS, type Permission } from "./api/permissions";
import type { Auth, AuthSession } from "./auth";
import type { AccessEnv } from "./env";

/** A signed-in user and what they may open. */
export type AuthContext = AuthSession & { isAdmin: boolean; permissions: Permission[] };

export type Authorization = { ok: true; auth: AuthContext } | { ok: false; status: 401 | 403 };

/** What a route requires beyond a signed-in admin or member. */
export type Requirement = { admin?: boolean; permission?: Permission };

/** Whether the signed-in user meets the route's requirement. */
export function canAccess(auth: AuthContext, requirement: Requirement): boolean {
  if (requirement.admin && !auth.isAdmin) return false;
  if (requirement.permission && !auth.permissions.includes(requirement.permission)) return false;
  return true;
}

/** Who's signed in and what they may open: admins (ADMIN_GITHUB_IDS) and members. */
export class AccessControl {
  private readonly adminIds: ReadonlySet<string>;

  constructor(
    env: Pick<AccessEnv, "ADMIN_GITHUB_IDS">,
    private readonly prisma: PrismaClient,
    private readonly auth: Auth,
  ) {
    this.adminIds = new Set(env.ADMIN_GITHUB_IDS);
  }

  isAdminGithubId(githubId: string): boolean {
    return this.adminIds.has(githubId);
  }

  /**
   * The request's session plus what it may open: 401 without a session, 403 for a session that
   * outlived a removed member (sign-in already checks this).
   */
  async authorize(headers: Headers): Promise<Authorization> {
    const session = await this.auth.api.getSession({ headers });
    if (!session) return { ok: false, status: 401 };

    const { isAdmin, isMember, permissions } = await this.load(session.user.id);
    if (!isAdmin && !isMember) return { ok: false, status: 403 };
    return { ok: true, auth: { ...session, isAdmin, permissions } };
  }

  /** Whether the user is an admin, whether they're on the members list, and their tabs. */
  async load(
    userId: string,
  ): Promise<{ isAdmin: boolean; isMember: boolean; permissions: Permission[] }> {
    const accounts = await this.prisma.account.findMany({
      where: { userId, providerId: "github" },
      select: { accountId: true },
    });
    const githubIds = accounts.map(({ accountId }) => accountId);
    const isAdmin = githubIds.some((id) => this.adminIds.has(id));
    const members =
      githubIds.length > 0
        ? await this.prisma.member.findMany({
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
