import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { fromNodeHeaders } from "better-auth/node";
import type { Request } from "express";
import type { AuthSession } from "./auth";
import { ALLOW_ANONYMOUS } from "./allow-anonymous.decorator";
import { AuthService } from "./auth.service";

export type AuthenticatedRequest = Request & { authSession: AuthSession };

/** Global guard: every route requires an admin session unless marked @AllowAnonymous(). */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowAnonymous = this.reflector.getAllAndOverride<boolean>(ALLOW_ANONYMOUS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowAnonymous) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = await this.authService.auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    if (!session) throw new UnauthorizedException();
    if (session.user.role !== "admin") throw new ForbiddenException();

    request.authSession = session;
    return true;
  }
}
