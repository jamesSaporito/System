import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadEnv } from "./env";

const env = loadEnv();
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
await app.listen(env.PORT, "0.0.0.0");
