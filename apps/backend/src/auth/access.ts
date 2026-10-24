import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { SiteRole } from "@portfolio/contracts";
import type { Request } from "express";
import type { AuthSession } from "./auth";

export type AuthContext = AuthSession & {
  isPlatformAdmin: boolean;
  /** siteId → the user's role there. Platform admins also act as owners of sites not listed. */
  memberships: ReadonlyMap<string, SiteRole>;
};

export type AuthenticatedRequest = Request & { auth: AuthContext };

const ROLE_RANK: Record<SiteRole, number> = { EDITOR: 1, OWNER: 2 };

export function hasRole(role: SiteRole, required: SiteRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export const ALLOW_ANONYMOUS = "access:allowAnonymous";
export const REQUIRE_PLATFORM_ADMIN = "access:requirePlatformAdmin";
export const REQUIRE_SITE_ROLE = "access:requireSiteRole";

/** Skips the global SessionGuard for a controller or route. */
export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS, true);

/** Only platform admins (ADMIN_GITHUB_IDS). */
export const RequirePlatformAdmin = () => SetMetadata(REQUIRE_PLATFORM_ADMIN, true);

/**
 * Requires at least this role on the site in the `:siteId` route param.
 * Non-members get 404, so a site's existence isn't revealed.
 */
export const RequireSiteRole = (role: SiteRole) => SetMetadata(REQUIRE_SITE_ROLE, role);

/** The signed-in user's AuthContext, set by SessionGuard. */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);
