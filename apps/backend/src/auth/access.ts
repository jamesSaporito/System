import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { Request } from "express";
import type { AuthSession } from "./auth";

export type AuthContext = AuthSession & { isAdmin: boolean };

export type AuthenticatedRequest = Request & { auth: AuthContext };

export const ALLOW_ANONYMOUS = "access:allowAnonymous";
export const REQUIRE_ADMIN = "access:requireAdmin";

/** Skips the global SessionGuard for a controller or route. */
export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS, true);

/** Only admins (ADMIN_GITHUB_IDS). */
export const RequireAdmin = () => SetMetadata(REQUIRE_ADMIN, true);

/** The signed-in user's AuthContext, set by SessionGuard. */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);
