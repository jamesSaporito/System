import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fromNodeHeaders } from "better-auth/node";
import { ALLOW_ANONYMOUS, type AuthenticatedRequest, REQUIRE_ADMIN } from "./access";
import { AccessService } from "./access.service";
import { AuthService } from "./auth.service";

/**
 * Global guard: every route requires a session from an admin or member unless marked
 * @AllowAnonymous(), plus admin when the route declares @RequireAdmin().
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

    // Sign-in already checks this; re-checking covers sessions that outlive a removed member.
    const { isAdmin, isMember } = await this.access.load(session.user.id);
    if (!isAdmin && !isMember) throw new ForbiddenException();
    request.auth = { ...session, isAdmin };

    if (this.reflector.getAllAndOverride<boolean>(REQUIRE_ADMIN, targets) && !isAdmin) {
      throw new ForbiddenException();
    }
    return true;
  }
}
