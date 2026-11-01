import { Inject, Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SecurityBriefRunner } from "@portfolio/security-brief";
import { ENV, type Env } from "../env";

/** Writes the brief every day at 12:00 UTC when SECURITY_NEWS_SCHEDULE is on. */
@Injectable()
export class SecurityBriefScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(SecurityBriefScheduler.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly runner: SecurityBriefRunner,
  ) {}

  // Keep the hour in step with RUN_HOUR_UTC in packages/security-brief/src/schedule.ts.
  @Cron("0 12 * * *", { name: "security-brief", timeZone: "UTC" })
  async daily(): Promise<void> {
    await this.check("daily");
  }

  /** Catches up a run missed while the process was down; not awaited, a run takes minutes. */
  onApplicationBootstrap(): void {
    void this.check("startup");
  }

  private async check(trigger: string): Promise<void> {
    if (!this.env.SECURITY_NEWS_SCHEDULE) return;
    try {
      const outcome = await this.runner.runScheduled();
      this.logger.log(`Security brief check (${trigger}): ${outcome}`);
    } catch (error) {
      this.logger.error(`Security brief check (${trigger}) failed: ${String(error)}`);
    }
  }
}
