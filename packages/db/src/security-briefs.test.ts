import { securityBriefSectionSchema, securitySeveritySchema } from "@portfolio/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPrismaClient, Prisma, SecurityBriefSection, SecuritySeverity } from "./index";

// Runs against the local database (Turbo migrates it first). Rows use a run date no real brief
// will have, so cleanup can't touch real data.
const RUN_ON = "1999-01-01";
const prisma = createPrismaClient(process.env.DATABASE_URL ?? "");

/** A calendar date for a DATE column: UTC midnight going in, YYYY-MM-DD coming out. */
const date = (iso: string) => new Date(iso);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

async function cleanup() {
  await prisma.securityBrief.deleteMany({ where: { runOn: date(RUN_ON) } });
}

function createBrief() {
  return prisma.securityBrief.create({
    data: {
      runOn: date(RUN_ON),
      coversFrom: date("1998-12-25"),
      coversTo: date(RUN_ON),
      mostUrgent: "Nothing critical",
      markdown: "# Security News",
      items: {
        create: [
          // Out of reading order on purpose, to check the enum sorts.
          {
            section: "WORTH_KNOWING",
            position: 0,
            product: "Chrome",
            title: "stable update",
            sources: [{ label: "Chrome", url: "https://example.com/chrome" }],
          },
          {
            section: "CRITICAL_AND_HIGH",
            position: 0,
            product: "GitLab",
            title: "account takeover",
            advisoryIds: ["CVE-1999-0002"],
            severity: "HIGH",
            cvssScore: 8.1,
            cvssVersion: "3.1",
            affected: "17.x",
            fix: "17.5.1",
            publishedOn: date("1998-12-30"),
            whyItMatters: "Widely self-hosted.",
            sources: [{ label: "GitLab", url: "https://example.com/gitlab" }],
          },
          {
            section: "ACTIVELY_EXPLOITED",
            position: 1,
            product: "PHP",
            title: "second item",
            severity: "CRITICAL",
            sources: [{ label: "PHP", url: "https://example.com/php2" }],
          },
          {
            section: "ACTIVELY_EXPLOITED",
            position: 0,
            product: "PHP",
            title: "unauthenticated RCE",
            advisoryIds: ["CVE-1999-0001", "GHSA-4w2v-q235-vp99"],
            severity: "CRITICAL",
            cvssScore: 9.2,
            cvssVersion: "4.0",
            exploitationStatus: "exploited in the wild",
            kevAddedOn: date("1998-12-28"),
            affected: "8.2 before 8.2.35",
            fix: "8.2.35",
            publishedOn: date("1998-12-26"),
            whyItMatters: "It's PHP.",
            isUpdate: true,
            updateNote: "fix released",
            sources: [{ label: "CISA", url: "https://example.com/cisa" }],
          },
        ],
      },
    },
  });
}

describe("security briefs", () => {
  beforeAll(cleanup);
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("stores a brief with items, round-trips dates, and orders items by section then position", async () => {
    const created = await createBrief();
    const brief = await prisma.securityBrief.findUniqueOrThrow({
      where: { runOn: date(RUN_ON) },
      include: { items: { orderBy: [{ section: "asc" }, { position: "asc" }] } },
    });

    expect(brief.id).toBe(created.id);
    expect(toIso(brief.runOn)).toBe(RUN_ON);
    expect(toIso(brief.coversFrom)).toBe("1998-12-25");
    expect(brief.items.map((item) => [item.section, item.position])).toEqual([
      ["ACTIVELY_EXPLOITED", 0],
      ["ACTIVELY_EXPLOITED", 1],
      ["CRITICAL_AND_HIGH", 0],
      ["WORTH_KNOWING", 0],
    ]);

    const [first] = brief.items;
    expect(first?.advisoryIds).toEqual(["CVE-1999-0001", "GHSA-4w2v-q235-vp99"]);
    expect(first?.severity).toBe("CRITICAL");
    expect(first?.cvssScore).toBe(9.2);
    expect(first?.publishedOn && toIso(first.publishedOn)).toBe("1998-12-26");
    expect(first?.kevAddedOn && toIso(first.kevAddedOn)).toBe("1998-12-28");
    expect(first?.isUpdate).toBe(true);
    expect(first?.sources).toEqual([{ label: "CISA", url: "https://example.com/cisa" }]);

    const worthKnowing = brief.items.at(-1);
    expect(worthKnowing?.advisoryIds).toEqual([]);
    expect(worthKnowing?.severity).toBeNull();
    expect(worthKnowing?.publishedOn).toBeNull();
    expect(worthKnowing?.isUpdate).toBe(false);
  });

  it("allows one brief per run date", async () => {
    await expect(createBrief()).rejects.toMatchObject({ code: "P2002" });
    await expect(createBrief()).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  });

  it("allows one item per section slot", async () => {
    const brief = await prisma.securityBrief.findUniqueOrThrow({ where: { runOn: date(RUN_ON) } });
    await expect(
      prisma.securityBriefItem.create({
        data: {
          briefId: brief.id,
          section: "WORTH_KNOWING",
          position: 0,
          product: "Firefox",
          title: "duplicate slot",
          sources: [],
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("deletes a brief's items with the brief", async () => {
    const brief = await prisma.securityBrief.findUniqueOrThrow({ where: { runOn: date(RUN_ON) } });
    await prisma.securityBrief.delete({ where: { id: brief.id } });
    expect(await prisma.securityBriefItem.count({ where: { briefId: brief.id } })).toBe(0);
  });

  it("has the same enum values as @portfolio/contracts", () => {
    expect(Object.values(SecurityBriefSection)).toEqual(securityBriefSectionSchema.options);
    expect(Object.values(SecuritySeverity)).toEqual(securitySeveritySchema.options);
  });
});
