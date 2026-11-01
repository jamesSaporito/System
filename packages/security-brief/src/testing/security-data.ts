import type { PrismaClient } from "@portfolio/db";
import { afterAll, beforeAll } from "vitest";

// The security brief's tables are shared, not keyed by date: a run reads every waiting entry
// and moves the shared cursors. Tests share the dev database, so the brief's real rows are set
// aside while a test file runs and put back after it, ids and links intact.

/** Removes every feed entry, item, feed and cursor, and test-dated runs. */
export async function clearSecurityData(prisma: PrismaClient, testRunsFrom: string): Promise<void> {
  await prisma.securityFeedEntry.deleteMany();
  await prisma.securityBriefItem.deleteMany();
  await prisma.securityNewsFeed.deleteMany();
  await prisma.securityNewsSettings.deleteMany();
  await prisma.securityBriefRun.deleteMany({ where: { runOn: { gte: new Date(testRunsFrom) } } });
}

/** Sets the real security data aside for the file's tests, and restores it after them. */
export function isolateSecurityData(prisma: PrismaClient, testRunsFrom: string): void {
  let saved: {
    items: Awaited<ReturnType<PrismaClient["securityBriefItem"]["findMany"]>>;
    entries: Awaited<ReturnType<PrismaClient["securityFeedEntry"]["findMany"]>>;
    feeds: Awaited<ReturnType<PrismaClient["securityNewsFeed"]["findMany"]>>;
    settings: Awaited<ReturnType<PrismaClient["securityNewsSettings"]["findMany"]>>;
  } | null = null;

  beforeAll(async () => {
    saved = {
      items: await prisma.securityBriefItem.findMany(),
      entries: await prisma.securityFeedEntry.findMany(),
      feeds: await prisma.securityNewsFeed.findMany(),
      settings: await prisma.securityNewsSettings.findMany(),
    };
    await clearSecurityData(prisma, testRunsFrom);
  });

  afterAll(async () => {
    await clearSecurityData(prisma, testRunsFrom);
    if (!saved) return;
    const { items, entries, feeds, settings } = saved;
    // JSON columns read back as JsonValue, which includes null; these columns are never null.
    await prisma.securityBriefItem.createMany({
      data: items.map((item) => ({ ...item, sources: item.sources ?? [] })),
    });
    await prisma.securityFeedEntry.createMany({
      data: entries.map((entry) => ({ ...entry, data: entry.data ?? {} })),
    });
    await prisma.securityNewsFeed.createMany({ data: feeds });
    await prisma.securityNewsSettings.createMany({ data: settings });
  });
}
