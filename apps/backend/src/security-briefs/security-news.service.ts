import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  BriefRunError,
  type ModelApi,
  noUsage,
  runBrief,
  type Usage,
} from "@portfolio/security-news";
import { isDue, runDate } from "./schedule";
import { SecurityBriefsService } from "./security-briefs.service";
import { SecurityNewsSourcesService } from "./security-news-sources.service";

/** The model the brief is written with; null when ANTHROPIC_API_KEY isn't set. Tests override it. */
export const MODEL_API = Symbol("MODEL_API");
/** Returns the current time. Tests override it so a run can't touch today's real brief. */
export const CLOCK = Symbol("CLOCK");

export type StartResult = "started" | "running" | "unconfigured";
/** How a finished run ended. */
export type RunOutcome = "stored" | "nothing new" | "failed";
export type RunNowResult = RunOutcome | "running" | "unconfigured";

/** Writes the daily security brief (packages/security-news) and stores it. One run at a time. */
@Injectable()
export class SecurityNewsService {
  private readonly logger = new Logger(SecurityNewsService.name);
  /** The run in progress, resolving to how it ended. */
  private current: Promise<RunOutcome> | null = null;

  constructor(
    @Inject(MODEL_API) private readonly model: ModelApi | null,
    @Inject(CLOCK) private readonly now: () => Date,
    private readonly briefs: SecurityBriefsService,
    private readonly sources: SecurityNewsSourcesService,
  ) {}

  /** Starts a run in the background, replacing today's brief if there is one. */
  start(): StartResult {
    if (!this.model) return "unconfigured";
    if (this.current) return "running";
    this.current = this.run(this.model, runDate(this.now())).finally(() => {
      this.current = null;
    });
    return "started";
  }

  /** Runs now and waits for the outcome; used by the security-brief command. */
  async runNow(): Promise<RunNowResult> {
    const started = this.start();
    if (started !== "started") return started;
    return (await this.current) ?? "failed";
  }

  /** The scheduled path: starts a run only if one is due (see isDue). */
  async runScheduled(): Promise<StartResult | "not due"> {
    const now = this.now();
    if (!this.model) return "unconfigured";
    if (this.current) return "running";
    if (!isDue(now, await this.briefs.ranOn(runDate(now)))) return "not due";
    return this.start();
  }

  /** Resolves when the current run, if any, has finished. */
  async whenIdle(): Promise<void> {
    await this.current;
  }

  /** Every run is logged in security_brief_runs with what it cost, whatever its outcome. */
  private async run(model: ModelApi, today: string): Promise<RunOutcome> {
    try {
      const result = await runBrief({
        model,
        today,
        sources: await this.sources.forResearch(),
        backend: {
          latest: () => this.briefs.latest(today),
          store: (brief) => this.briefs.upsert(brief),
        },
      });
      if (result.outcome === "nothing new") {
        await this.briefs.recordRun({ runOn: today, outcome: "NOTHING_NEW", usage: result.usage });
        this.logger.log(JSON.stringify({ message: "security brief: nothing new", ...result }));
        return "nothing new";
      }
      await this.briefs.recordRun({ runOn: today, outcome: "STORED", usage: result.usage });
      this.logger.log(JSON.stringify({ message: "security brief stored", ...result }));
      return "stored";
    } catch (error) {
      // Nothing was stored; the next scheduled check or a manual run tries again.
      let usage: Usage = noUsage();
      if (error instanceof BriefRunError) {
        ({ usage } = error);
        this.logger.error(
          JSON.stringify({ message: "security brief failed", reason: error.message, usage }),
        );
        this.logger.warn(`Researched brief, not stored:\n${error.markdown}`);
      } else {
        this.logger.error(`Security brief failed: ${String(error)}`);
      }
      await this.recordFailure(today, usage, error);
      return "failed";
    }
  }

  private async recordFailure(runOn: string, usage: Usage, error: unknown): Promise<void> {
    const reason = error instanceof Error ? error.message : String(error);
    try {
      await this.briefs.recordRun({ runOn, outcome: "FAILED", usage, error: reason });
    } catch (logError) {
      this.logger.error(`Couldn't log the failed run: ${String(logError)}`);
    }
  }
}
