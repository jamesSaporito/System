/** The scheduled run starts at this hour, UTC (see the @Cron on SecurityNewsScheduler). */
export const RUN_HOUR_UTC = 12;

/** The day a run at `now` is for, as YYYY-MM-DD in UTC. */
export const runDate = (now: Date): string => now.toISOString().slice(0, 10);

/**
 * Whether the scheduled run should start: it's past the run hour and today hasn't had a run that
 * stored a brief or found nothing new (a failed run is tried again). The same rule serves the
 * daily trigger and the startup catch-up, so a restart or deploy at 12:00 can't skip a day, and a
 * restart after the run can't repeat it.
 */
export function isDue(now: Date, ranToday: boolean): boolean {
  return !ranToday && now.getUTCHours() >= RUN_HOUR_UTC;
}
