import { Logger, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import {
  createBriefModel,
  type FetchLike,
  type ModelApi,
  PrismaBriefStore,
  PrismaSourcesStore,
  SecurityBriefRunner,
} from "@portfolio/security-brief";
import { ENV, type Env } from "../env";
import { PrismaService } from "../prisma/prisma.service";
import { SecurityBriefsController } from "./security-briefs.controller";
import { SecurityNewsSourcesController } from "./security-news-sources.controller";
import { SecurityBriefScheduler } from "./security-brief.scheduler";

/** The model the brief is written with; null when ANTHROPIC_API_KEY isn't set. Tests override it. */
export const MODEL_API = Symbol("MODEL_API");
/** Returns the current time. Tests override it so a run can't touch today's real brief. */
export const CLOCK = Symbol("CLOCK");
/** How the feeds are read: the global fetch. Tests override it with fixtures. */
export const FEED_FETCH = Symbol("FEED_FETCH");

/** Wires packages/security-brief into Nest: its stores, the runner, routes and the schedule. */
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SecurityBriefsController, SecurityNewsSourcesController],
  providers: [
    {
      provide: PrismaBriefStore,
      useFactory: (prisma: PrismaService) => new PrismaBriefStore(prisma.client),
      inject: [PrismaService],
    },
    {
      provide: PrismaSourcesStore,
      useFactory: (prisma: PrismaService) => new PrismaSourcesStore(prisma.client),
      inject: [PrismaService],
    },
    {
      provide: SecurityBriefRunner,
      useFactory: (
        model: ModelApi | null,
        now: () => Date,
        fetch: FetchLike,
        briefs: PrismaBriefStore,
        sources: PrismaSourcesStore,
      ) =>
        new SecurityBriefRunner({
          model,
          now,
          fetch,
          briefs,
          sources,
          logger: new Logger(SecurityBriefRunner.name),
        }),
      inject: [MODEL_API, CLOCK, FEED_FETCH, PrismaBriefStore, PrismaSourcesStore],
    },
    SecurityBriefScheduler,
    {
      provide: MODEL_API,
      useFactory: (env: Env) =>
        env.ANTHROPIC_API_KEY ? createBriefModel(env.ANTHROPIC_API_KEY) : null,
      inject: [ENV],
    },
    { provide: CLOCK, useValue: () => new Date() },
    { provide: FEED_FETCH, useValue: (url: string, init?: RequestInit) => fetch(url, init) },
  ],
})
export class SecurityBriefModule {}
