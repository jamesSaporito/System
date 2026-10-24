import { StandardSchemaValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import { AuthService } from "./auth/auth.service";
import { ENV, type Env } from "./env";

/**
 * Shared by main.ts and tests. The app must be created with `bodyParser: false`:
 * Better Auth reads raw request bodies, so Nest's JSON parser is added after its handler.
 */
export function configureApp(app: NestExpressApplication): NestExpressApplication {
  const env = app.get<Env>(ENV);
  app.enableCors({ origin: env.ADMIN_URL, credentials: true });
  app
    .getHttpAdapter()
    .getInstance()
    .all("/api/auth/{*path}", toNodeHandler(app.get(AuthService).auth));
  app.useBodyParser("json");
  // Validates @Body({ schema }) etc. with the Zod schemas from @portfolio/contracts.
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();
  return app;
}
