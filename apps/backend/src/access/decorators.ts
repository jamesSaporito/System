import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { AuthContext } from "@portfolio/access";
import type { Permission } from "@portfolio/access/api";
import type { Request } from "express";

export type { AuthContext };

export type AuthenticatedRequest = Request & { auth: AuthContext };

export const ALLOW_ANONYMOUS = "access:allowAnonymous";
export const REQUIRE_ADMIN = "access:requireAdmin";
export const REQUIRE_PERMISSION = "access:requirePermission";

/** Skips the global SessionGuard for a controller or route. */
export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS, true);

/** Only admins (ADMIN_GITHUB_IDS). */
export const RequireAdmin = () => SetMetadata(REQUIRE_ADMIN, true);

/** Admins, or members who've been granted the permission (the admin tab the route serves). */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(REQUIRE_PERMISSION, permission);

/** The signed-in user's AuthContext, set by SessionGuard. */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);
