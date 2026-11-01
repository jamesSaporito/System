import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SecurityNewsService } from "./security-briefs/security-news.service";

// `pnpm security-brief`: writes today's security brief now and waits for it, without HTTP or a
// session. Exits non-zero unless it stored a brief or found nothing new to report.
const app = await NestFactory.createApplicationContext(AppModule);
const outcome = await app.get(SecurityNewsService).runNow();
await app.close();
console.log(`Security brief: ${outcome}`);
process.exit(outcome === "stored" || outcome === "nothing new" ? 0 : 1);
