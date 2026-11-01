import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Permission } from "@portfolio/contracts";
import {
  ALLOW_ANONYMOUS,
  type AuthenticatedRequest,
  REQUIRE_ADMIN,
  REQUIRE_PERMISSION,
} from "./access";
import { AccessService } from "./access.service";

/**
 * Global guard: every route requires a session from an admin or member unless marked
 * @AllowAnonymous(), plus admin when the route declares @RequireAdmin(), or the permission it
 * declares with @RequirePermission().
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(ALLOW_ANONYMOUS, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const result = await this.access.authorize(request.headers);
    if (!result.ok) {
      throw result.status === 401 ? new UnauthorizedException() : new ForbiddenException();
    }
    const { auth } = result;
    request.auth = auth;

    if (this.reflector.getAllAndOverride<boolean>(REQUIRE_ADMIN, targets) && !auth.isAdmin) {
      throw new ForbiddenException();
    }
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(
      REQUIRE_PERMISSION,
      targets,
    );
    if (permission && !auth.permissions.includes(permission)) throw new ForbiddenException();
    return true;
  }
}
