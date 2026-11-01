import {
  createPrismaClient,
  SecurityBriefRunOutcome,
  SecurityBriefSection,
  SecurityFeedSource,
  SecuritySeverity,
} from "@portfolio/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  securityBriefRunOutcomeSchema,
  securityBriefSectionSchema,
  securitySeveritySchema,
} from "../api/brief";
import type { CollectedEntry } from "../feeds/feeds";

// What PrismaBriefStore relies on from the schema. Runs against the local database (Turbo
// migrates it first). Rows are marked so cleanup can't touch real data: entries' external ids
// start with MARK, and items are dated FIRST_SEEN, a day no real item has.
const MARK = "storage-test:";
const FIRST_SEEN = "1999-01-01";
const prisma = createPrismaClient(process.env.DATABASE_URL ?? "");

/** A calendar date for a DATE column: UTC midnight going in, YYYY-MM-DD coming out. */
const date = (iso: string) => new Date(iso);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

async function cleanup() {
  await prisma.securityFeedEntry.deleteMany({ where: { externalId: { startsWith: MARK } } });
  await prisma.securityBriefItem.deleteMany({ where: { firstSeenOn: date(FIRST_SEEN) } });
}

const entry = (externalId: string) => ({
  source: "NEWS" as const,
  externalId: `${MARK}${externalId}`,
  advisoryIds: ["CVE-1999-0001"],
  publishedOn: date("1998-12-31"),
  data: { title: "A story" },
});

describe("security brief storage", () => {
  beforeAll(cleanup);
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("stores an entry once per source and id, so a refetch adds nothing", async () => {
    const first = await prisma.securityFeedEntry.createMany({
      data: [entry("a"), entry("b")],
      skipDuplicates: true,
    });
    const again = await prisma.securityFeedEntry.createMany({
      data: [entry("a"), entry("c")],
      skipDuplicates: true,
    });
    expect([first.count, again.count]).toEqual([2, 1]);
    // The same id from another source is another entry.
    await prisma.securityFeedEntry.create({ data: { ...entry("a"), source: "KEV" } });
  });

  it("links entries to an item, round-trips dates, and frees them if it's deleted", async () => {
    const item = await prisma.securityBriefItem.create({
      data: {
        section: "ACTIVELY_EXPLOITED",
        subject: "PHP",
        title: "Remote code execution",
        advisoryIds: ["CVE-1999-0001"],
        severity: "CRITICAL",
        exploitedInTheWild: true,
        kevAddedOn: date("1998-12-28"),
        sources: [{ label: "CISA KEV", url: "https://example.com/kev" }],
        firstSeenOn: date(FIRST_SEEN),
        updatedOn: date("1999-01-02"),
      },
    });
    await prisma.securityFeedEntry.updateMany({
      where: { externalId: { startsWith: MARK } },
      data: { itemId: item.id },
    });

    const stored = await prisma.securityBriefItem.findUniqueOrThrow({
      where: { id: item.id },
      include: { entries: true },
    });
    expect(toIso(stored.firstSeenOn)).toBe(FIRST_SEEN);
    expect(stored.updatedOn && toIso(stored.updatedOn)).toBe("1999-01-02");
    expect(stored.kevAddedOn && toIso(stored.kevAddedOn)).toBe("1998-12-28");
    expect(stored.entries.map((linked) => toIso(linked.publishedOn))).toContain("1998-12-31");
    expect(stored.entries).toHaveLength(4);

    await prisma.securityBriefItem.delete({ where: { id: item.id } });
    expect(
      await prisma.securityFeedEntry.count({
        where: { externalId: { startsWith: MARK }, itemId: null },
      }),
    ).toBe(4);
  });

  it("finds items by any of their advisory ids", async () => {
    await prisma.securityBriefItem.create({
      data: {
        section: "WORTH_KNOWING",
        subject: "Example",
        title: "Story",
        advisoryIds: ["CVE-1999-0002", "GHSA-4w2v-q235-vp99"],
        sources: [],
        firstSeenOn: date(FIRST_SEEN),
      },
    });
    const found = await prisma.securityBriefItem.count({
      where: {
        firstSeenOn: date(FIRST_SEEN),
        advisoryIds: { hasSome: ["GHSA-4w2v-q235-vp99", "CVE-1999-9999"] },
      },
    });
    expect(found).toBe(1);
  });

  it("has the same enum values as the API schemas and the feed readers", () => {
    expect(Object.values(SecurityBriefSection)).toEqual(securityBriefSectionSchema.options);
    expect(Object.values(SecuritySeverity)).toEqual(securitySeveritySchema.options);
    expect(Object.values(SecurityBriefRunOutcome)).toEqual(securityBriefRunOutcomeSchema.options);
    const sources: CollectedEntry["source"][] = ["KEV", "GITHUB", "NEWS"];
    expect(Object.values(SecurityFeedSource)).toEqual(sources);
  });
});
