import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { createAnthropicModelApi } from "@portfolio/security-news";
import { ENV, type Env } from "../env";
import { SecurityBriefsController } from "./security-briefs.controller";
import { SecurityBriefsService } from "./security-briefs.service";
import { SecurityNewsSourcesController } from "./security-news-sources.controller";
import { SecurityNewsSourcesService } from "./security-news-sources.service";
import { SecurityNewsScheduler } from "./security-news.scheduler";
import { CLOCK, MODEL_API, SecurityNewsService } from "./security-news.service";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SecurityBriefsController, SecurityNewsSourcesController],
  providers: [
    SecurityBriefsService,
    SecurityNewsSourcesService,
    SecurityNewsService,
    SecurityNewsScheduler,
    {
      provide: MODEL_API,
      useFactory: (env: Env) =>
        env.ANTHROPIC_API_KEY ? createAnthropicModelApi(env.ANTHROPIC_API_KEY) : null,
      inject: [ENV],
    },
    { provide: CLOCK, useValue: () => new Date() },
  ],
})
export class SecurityBriefsModule {}
