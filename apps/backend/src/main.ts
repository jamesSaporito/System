import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import { AppModule } from "./app.module";
import { AuthService } from "./auth/auth.service";
import { loadEnv } from "./env";

const env = loadEnv();
// Better Auth reads raw request bodies, so Nest's JSON parser is added after its handler.
const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
app.enableCors({ origin: env.ADMIN_URL, credentials: true });
app
  .getHttpAdapter()
  .getInstance()
  .all("/api/auth/{*path}", toNodeHandler(app.get(AuthService).auth));
app.useBodyParser("json");
app.enableShutdownHooks();
await app.listen(env.PORT, "0.0.0.0");
