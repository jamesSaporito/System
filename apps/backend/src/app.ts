import { StandardSchemaValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { AccessService } from "./auth/access.service";
import { AuthService } from "./auth/auth.service";
import { ENV, type Env } from "./env";

/** Better Auth's session-management endpoints, which back the admin's Sessions tab. */
const SESSION_ENDPOINTS = new Set([
  "/api/auth/list-sessions",
  "/api/auth/revoke-session",
  "/api/auth/revoke-sessions",
  "/api/auth/revoke-other-sessions",
]);

/**
 * Better Auth's handler sits outside Nest, so SessionGuard never sees these requests: require the
 * SESSIONS permission here. Sign-in, callback and sign-out stay open to anyone allowed in.
 */
function requireSessionsPermission(access: AccessService) {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (!SESSION_ENDPOINTS.has(request.path.replace(/\/+$/, ""))) return next();
      const result = await access.authorize(request.headers);
      if (!result.ok) {
        const message = result.status === 401 ? "Unauthorized" : "Forbidden";
        return void response.status(result.status).json({ message });
      }
      if (!result.auth.permissions.includes("SESSIONS")) {
        return void response.status(403).json({ message: "Forbidden" });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Shared by main.ts and tests. The app must be created with `bodyParser: false`:
 * Better Auth reads raw request bodies, so Nest's JSON parser is added after its handler.
 */
export function configureApp(app: NestExpressApplication): NestExpressApplication {
  const env = app.get<Env>(ENV);
  app.enableCors({ origin: env.ADMIN_URL, credentials: true });
  const server = app.getHttpAdapter().getInstance();
  server.use(requireSessionsPermission(app.get(AccessService)));
  server.all("/api/auth/{*path}", toNodeHandler(app.get(AuthService).auth));
  app.useBodyParser("json");
  // Validates @Body({ schema }) etc. with the Zod schemas from @portfolio/contracts.
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();
  return app;
}
