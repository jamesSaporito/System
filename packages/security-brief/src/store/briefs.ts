import type { Usage } from "@portfolio/ai";
import type {
  PrismaClient,
  SecurityBriefItem as ItemRow,
  SecurityFeedEntry as EntryRow,
} from "@portfolio/db";
import { z } from "zod";
import {
  type SecurityBriefDay,
  type SecurityBriefDayResponse,
  type SecurityBriefDaysResponse,
  type SecurityBriefItem,
  type SecurityBriefRunOutcome,
  type SecurityBriefStatusResponse,
  securitySourceSchema,
} from "../api/brief";
import { type ExistingItem, type ItemWrite, type StoredEntry, storedEntry } from "../brief/group";
import type { Backend } from "../brief/run";
import type { CollectedEntry, FeedFailure } from "../feeds/feeds";

/** Calendar dates go to and from DATE columns as YYYY-MM-DD. */
const toDate = (iso: string) => new Date(iso);
const toIso = (date: Date) => date.toISOString().slice(0, 10);
const toIsoOrNull = (date: Date | null) => date && toIso(date);

const sourcesSchema = z.array(securitySourceSchema);

const toEntry = (row: EntryRow): StoredEntry =>
  storedEntry({ ...row, publishedOn: toIso(row.publishedOn) });

/** A logged run, whatever its outcome, with what it cost and found. */
export type RunRecord = {
  runOn: string;
  outcome: SecurityBriefRunOutcome;
  usage: Usage;
  newEntries: number;
  newItems: number;
  updatedItems: number;
  feedFailures: FeedFailure[];
  error?: string;
};

/** Where feed entries, the items written from them, and the run log are kept. */
export type BriefStore = Backend & {
  /** Stores entries not seen before (by source and id); returns how many were new. */
  storeEntries: (entries: CollectedEntry[]) => Promise<number>;
  /** Days with items first seen or updated on them, newest first. */
  days: () => Promise<SecurityBriefDaysResponse>;
  /** The day's items, first seen or updated that day; null for a day without any. */
  day: (day: string) => Promise<SecurityBriefDayResponse | null>;
  recordRun: (run: RunRecord) => Promise<void>;
  /** The newest logged run, whatever its outcome. */
  lastRun: () => Promise<SecurityBriefStatusResponse["lastRun"]>;
  /** Whether a run for `runOn` stored items or found nothing new; failed runs don't count. */
  ranOn: (runOn: string) => Promise<boolean>;
};

/**
 * The brief's tables in Postgres: feed entries, the items written from them, and the run log.
 * Also the run's `Backend`: waiting entries, items by CVE, and saving what was written.
 */
export class PrismaBriefStore implements BriefStore {
  constructor(private readonly prisma: PrismaClient) {}

  /** Stores entries not seen before (by source and id); returns how many were new. */
  async storeEntries(entries: CollectedEntry[]): Promise<number> {
    if (entries.length === 0) return 0;
    const { count } = await this.prisma.securityFeedEntry.createMany({
      data: entries.map((entry) => ({
        source: entry.source,
        externalId: entry.externalId,
        advisoryIds: entry.advisoryIds,
        publishedOn: toDate(entry.publishedOn),
        data: entry.data,
      })),
      skipDuplicates: true,
    });
    return count;
  }

  async unprocessed(): Promise<StoredEntry[]> {
    const rows = await this.prisma.securityFeedEntry.findMany({
      where: { itemId: null },
      orderBy: [{ publishedOn: "asc" }, { source: "asc" }, { externalId: "asc" }],
    });
    return rows.map(toEntry);
  }

  async itemsWithIds(ids: string[]): Promise<ExistingItem[]> {
    const items = await this.prisma.securityBriefItem.findMany({
      where: { advisoryIds: { hasSome: ids } },
      include: {
        entries: { orderBy: [{ publishedOn: "asc" }, { source: "asc" }, { externalId: "asc" }] },
      },
    });
    return items.map((item) => ({
      id: item.id,
      advisoryIds: item.advisoryIds,
      firstSeenOn: toIso(item.firstSeenOn),
      updatedOn: toIsoOrNull(item.updatedOn),
      updateNote: item.updateNote,
      entries: item.entries.map(toEntry),
    }));
  }

  /** Creates and updates the items and links their entries, in one transaction. */
  async save(writes: ItemWrite[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const write of writes) {
        const { item } = write;
        const data = {
          section: item.section,
          subject: item.subject,
          title: item.title,
          advisoryIds: item.advisoryIds,
          severity: item.severity,
          cvssScore: item.cvssScore,
          cvssVersion: item.cvssVersion,
          exploitationStatus: item.exploitationStatus,
          exploitedInTheWild: item.exploitedInTheWild,
          kevAddedOn: item.kevAddedOn && toDate(item.kevAddedOn),
          affected: item.affected,
          fix: item.fix,
          publishedOn: item.publishedOn && toDate(item.publishedOn),
          impact: item.impact,
          updateNote: item.updateNote,
          sources: item.sources,
          firstSeenOn: toDate(write.firstSeenOn),
          updatedOn: write.updatedOn && toDate(write.updatedOn),
        };
        const { id } = write.itemId
          ? await tx.securityBriefItem.update({ where: { id: write.itemId }, data })
          : await tx.securityBriefItem.create({ data });
        await tx.securityFeedEntry.updateMany({
          where: { id: { in: write.entryIds }, itemId: null },
          data: { itemId: id },
        });
      }
    });
  }

  /** Days with items first seen or updated on them, newest first. */
  async days(): Promise<SecurityBriefDaysResponse> {
    const items = await this.prisma.securityBriefItem.findMany({
      select: { firstSeenOn: true, updatedOn: true },
    });
    const days = new Map<string, SecurityBriefDay>();
    const dayOf = (date: Date) => {
      const key = toIso(date);
      const found = days.get(key) ?? { day: key, itemCount: 0, updatedCount: 0 };
      days.set(key, found);
      return found;
    };
    for (const item of items) {
      dayOf(item.firstSeenOn).itemCount += 1;
      if (item.updatedOn) {
        const updated = dayOf(item.updatedOn);
        updated.itemCount += 1;
        updated.updatedCount += 1;
      }
    }
    return { days: [...days.values()].toSorted((a, b) => b.day.localeCompare(a.day)) };
  }

  /** The day's items, first seen or updated that day; null for a day without any. */
  async day(day: string): Promise<SecurityBriefDayResponse | null> {
    const date = toDate(day);
    const items = await this.prisma.securityBriefItem.findMany({
      where: { OR: [{ firstSeenOn: date }, { updatedOn: date }] },
      // Postgres sorts enums by declaration order: sections in reading order, severities from
      // critical down.
      orderBy: [
        { section: "asc" },
        { severity: { sort: "asc", nulls: "last" } },
        { cvssScore: { sort: "desc", nulls: "last" } },
        { publishedOn: { sort: "desc", nulls: "last" } },
        { subject: "asc" },
        { id: "asc" },
      ],
    });
    if (items.length === 0) return null;
    return { day, items: items.map((item) => toItem(item, day)) };
  }

  /** Logs a run, whatever its outcome, with what it cost and found. */
  async recordRun(run: RunRecord): Promise<void> {
    await this.prisma.securityBriefRun.create({
      data: {
        runOn: toDate(run.runOn),
        outcome: run.outcome,
        usage: run.usage,
        newEntries: run.newEntries,
        newItems: run.newItems,
        updatedItems: run.updatedItems,
        feedFailures: run.feedFailures,
        error: run.error ?? null,
      },
    });
  }

  /** The newest logged run, whatever its outcome. */
  async lastRun(): Promise<SecurityBriefStatusResponse["lastRun"]> {
    const run = await this.prisma.securityBriefRun.findFirst({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return (
      run && {
        runOn: toIso(run.runOn),
        outcome: run.outcome,
        error: run.error,
        newEntries: run.newEntries,
        newItems: run.newItems,
        updatedItems: run.updatedItems,
        finishedAt: run.createdAt.toISOString(),
      }
    );
  }

  /** Whether a run for `runOn` stored items or found nothing new; failed runs don't count. */
  async ranOn(runOn: string): Promise<boolean> {
    const runs = await this.prisma.securityBriefRun.count({
      where: { runOn: toDate(runOn), outcome: { in: ["STORED", "NOTHING_NEW"] } },
    });
    return runs > 0;
  }
}

function toItem(item: ItemRow, day: string): SecurityBriefItem {
  const firstSeenOn = toIso(item.firstSeenOn);
  return {
    id: item.id,
    section: item.section,
    subject: item.subject,
    title: item.title,
    advisoryIds: item.advisoryIds,
    severity: item.severity,
    cvssScore: item.cvssScore,
    cvssVersion: item.cvssVersion,
    exploitationStatus: item.exploitationStatus,
    exploitedInTheWild: item.exploitedInTheWild,
    kevAddedOn: toIsoOrNull(item.kevAddedOn),
    affected: item.affected,
    fix: item.fix,
    publishedOn: toIsoOrNull(item.publishedOn),
    impact: item.impact,
    updateNote: item.updateNote,
    sources: sourcesSchema.parse(item.sources),
    firstSeenOn,
    updatedOn: toIsoOrNull(item.updatedOn),
    isUpdate: firstSeenOn !== day,
  };
}
