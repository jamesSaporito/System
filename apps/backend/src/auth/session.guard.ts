import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { SiteRole } from "@portfolio/contracts";
import { fromNodeHeaders } from "better-auth/node";
import {
  ALLOW_ANONYMOUS,
  type AuthenticatedRequest,
  hasRole,
  REQUIRE_PLATFORM_ADMIN,
  REQUIRE_SITE_ROLE,
} from "./access";
import { AccessService } from "./access.service";
import { AuthService } from "./auth.service";

/**
 * Global guard: every route requires a session unless marked @AllowAnonymous(), plus whatever
 * @RequirePlatformAdmin() / @RequireSiteRole() the route declares.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(ALLOW_ANONYMOUS, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = await this.authService.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) throw new UnauthorizedException();
    request.auth = { ...session, ...(await this.access.load(session.user.id)) };

    if (
      this.reflector.getAllAndOverride<boolean>(REQUIRE_PLATFORM_ADMIN, targets) &&
      !request.auth.isPlatformAdmin
    ) {
      throw new ForbiddenException();
    }

    const requiredRole = this.reflector.getAllAndOverride<SiteRole | undefined>(
      REQUIRE_SITE_ROLE,
      targets,
    );
    if (requiredRole) {
      const siteId = request.params.siteId;
      if (typeof siteId !== "string")
        throw new Error("@RequireSiteRole() needs a :siteId route param");
      const role = await this.access.roleFor(request.auth, siteId);
      if (!role) throw new NotFoundException();
      if (!hasRole(role, requiredRole)) throw new ForbiddenException();
    }
    return true;
  }
}
