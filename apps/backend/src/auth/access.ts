import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { Permission } from "@portfolio/contracts";
import type { Request } from "express";
import type { AuthSession } from "./auth";

export type AuthContext = AuthSession & { isAdmin: boolean; permissions: Permission[] };

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
