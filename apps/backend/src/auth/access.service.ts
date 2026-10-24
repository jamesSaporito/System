import { Inject, Injectable } from "@nestjs/common";
import type { SiteRole } from "@portfolio/contracts";
import { ENV, type Env } from "../env";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthContext } from "./access";

@Injectable()
export class AccessService {
  private readonly platformAdminIds: ReadonlySet<string>;

  constructor(
    @Inject(ENV) env: Env,
    private readonly prisma: PrismaService,
  ) {
    this.platformAdminIds = new Set(env.ADMIN_GITHUB_IDS);
  }

  async load(userId: string): Promise<Pick<AuthContext, "isPlatformAdmin" | "memberships">> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        accounts: { where: { providerId: "github" }, select: { accountId: true } },
        memberships: { select: { siteId: true, role: true } },
      },
    });
    return {
      isPlatformAdmin:
        user?.accounts.some(({ accountId }) => this.platformAdminIds.has(accountId)) ?? false,
      memberships: new Map(user?.memberships.map(({ siteId, role }) => [siteId, role])),
    };
  }

  /** The user's effective role on a site, or null if they can't see it (or it doesn't exist). */
  async roleFor(auth: AuthContext, siteId: string): Promise<SiteRole | null> {
    const role = auth.memberships.get(siteId);
    if (role) return role;
    if (!auth.isPlatformAdmin) return null;
    const site = await this.prisma.client.site.findUnique({
      where: { id: siteId },
      select: { id: true },
    });
    return site ? "OWNER" : null;
  }
}
