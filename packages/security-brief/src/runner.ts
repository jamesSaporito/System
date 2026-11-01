import { noUsage, type Usage } from "@portfolio/ai";
import { BriefRunError, type ModelApi, runBrief } from "./brief/run";
import { collectFeeds, type FeedFailure, type FetchLike } from "./feeds/feeds";
import { isDue, runDate } from "./schedule";
import type { BriefStore } from "./store/briefs";
import type { SourcesStore } from "./store/sources";

export type StartResult = "started" | "running" | "unconfigured";
/** How a finished run ended. */
export type RunOutcome = "stored" | "nothing new" | "failed";

/** Where the runner reports runs; the app's logger. */
export type RunLogger = { log: (message: string) => void; error: (message: string) => void };

export type RunnerDeps = {
  /** The model the brief is written with; null when ANTHROPIC_API_KEY isn't set. */
  model: ModelApi | null;
  /** The current time; tests pass a fixed one so a run can't touch today's real brief. */
  now: () => Date;
  /** How the feeds are read; tests pass fixtures. */
  fetch: FetchLike;
  briefs: BriefStore;
  sources: SourcesStore;
  logger: RunLogger;
};

/**
 * The daily security brief: reads the feeds, stores their new entries, and writes the waiting
 * ones into items. One run at a time, held in memory, so it assumes one instance.
 */
export class SecurityBriefRunner {
  /** The run in progress, resolving to how it ended. */
  private current: Promise<RunOutcome> | null = null;
  /** When the run in progress started. */
  private startedAt: Date | null = null;
  private readonly model: ModelApi | null;
  private readonly now: () => Date;
  private readonly fetch: FetchLike;
  private readonly briefs: BriefStore;
  private readonly sources: SourcesStore;
  private readonly logger: RunLogger;

  constructor(deps: RunnerDeps) {
    this.model = deps.model;
    this.now = deps.now;
    this.fetch = deps.fetch;
    this.briefs = deps.briefs;
    this.sources = deps.sources;
    this.logger = deps.logger;
  }

  /** Starts a run in the background; `fullDay` reads at least the last 24 hours of every source. */
  start(options: { fullDay?: boolean } = {}): StartResult {
    if (!this.model) return "unconfigured";
    if (this.current) return "running";
    const startedAt = this.now();
    this.startedAt = startedAt;
    this.current = this.run(this.model, runDate(startedAt), options.fullDay ?? false).finally(
      () => {
        this.current = null;
        this.startedAt = null;
      },
    );
    return "started";
  }

  /** When the run in progress started; null when none is going. */
  runningSince(): Date | null {
    return this.startedAt;
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

  /**
   * Every run is logged in security_brief_runs with what it found and cost, whatever its outcome.
   * Entries are stored as soon as they're read, so a later failure loses none of them: they wait
   * for the next run, which writes them without reading them again.
   */
  private async run(model: ModelApi, today: string, fullDay: boolean): Promise<RunOutcome> {
    const found = { newEntries: 0, feedFailures: [] as FeedFailure[] };
    try {
      const startedAt = this.now();
      const collected = await collectFeeds({
        fetch: this.fetch,
        now: startedAt,
        cursors: await this.sources.cursors(),
        fullDay,
      });
      found.newEntries = await this.briefs.storeEntries(collected.entries);
      found.feedFailures = collected.failures;
      await this.sources.advanceCursors(collected.read, startedAt);
      if (!collected.read.kev && !collected.read.advisories) {
        const reasons = collected.failures.map((failure) => `${failure.source}: ${failure.reason}`);
        throw new Error(
          `Neither CISA KEV nor GitHub advisories could be read (${reasons.join("; ")})`,
        );
      }

      const result = await runBrief({ model, backend: this.briefs, today });
      if (result.outcome === "nothing new") {
        await this.briefs.recordRun({
          runOn: today,
          outcome: "NOTHING_NEW",
          usage: result.usage,
          newItems: 0,
          updatedItems: 0,
          ...found,
        });
        this.logger.log(JSON.stringify({ message: "security brief: nothing new", ...found }));
        return "nothing new";
      }
      const { usage, newItems, updatedItems } = result;
      await this.briefs.recordRun({
        runOn: today,
        outcome: "STORED",
        usage,
        newItems,
        updatedItems,
        ...found,
      });
      this.logger.log(
        JSON.stringify({
          message: "security brief stored",
          newItems,
          updatedItems,
          usage,
          ...found,
        }),
      );
      return "stored";
    } catch (error) {
      // What was written before the failure is kept; the rest waits for the next run.
      const done =
        error instanceof BriefRunError
          ? { usage: error.usage, newItems: error.newItems, updatedItems: error.updatedItems }
          : { usage: noUsage(), newItems: 0, updatedItems: 0 };
      this.logger.error(
        JSON.stringify({
          message: "security brief failed",
          reason: String(error),
          ...done,
          ...found,
        }),
      );
      await this.recordFailure(today, { ...done, ...found }, error);
      return "failed";
    }
  }

  private async recordFailure(
    runOn: string,
    counts: {
      usage: Usage;
      newEntries: number;
      newItems: number;
      updatedItems: number;
      feedFailures: FeedFailure[];
    },
    error: unknown,
  ): Promise<void> {
    const reason = error instanceof Error ? error.message : String(error);
    try {
      await this.briefs.recordRun({ runOn, outcome: "FAILED", ...counts, error: reason });
    } catch (logError) {
      this.logger.error(`Couldn't log the failed run: ${String(logError)}`);
    }
  }
}
