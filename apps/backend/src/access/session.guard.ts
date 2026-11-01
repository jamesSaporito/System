import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AccessControl, canAccess } from "@portfolio/access";
import type { Permission } from "@portfolio/access/api";
import { fromNodeHeaders } from "better-auth/node";
import {
  ALLOW_ANONYMOUS,
  type AuthenticatedRequest,
  REQUIRE_ADMIN,
  REQUIRE_PERMISSION,
} from "./decorators";

/**
 * Global guard: every route requires a session from an admin or member unless marked
 * @AllowAnonymous(), plus admin when the route declares @RequireAdmin(), or the permission it
 * declares with @RequirePermission().
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessControl,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(ALLOW_ANONYMOUS, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const result = await this.access.authorize(fromNodeHeaders(request.headers));
    if (!result.ok) {
      throw result.status === 401 ? new UnauthorizedException() : new ForbiddenException();
    }
    const { auth } = result;
    request.auth = auth;

    const admin = this.reflector.getAllAndOverride<boolean | undefined>(REQUIRE_ADMIN, targets);
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(
      REQUIRE_PERMISSION,
      targets,
    );
    if (!canAccess(auth, { admin, permission })) throw new ForbiddenException();
    return true;
  }
}
