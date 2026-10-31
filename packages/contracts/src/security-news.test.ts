import { describe, expect, it } from "vitest";
import type { z } from "zod";

import {
  advisoryIdSchema,
  securityBriefInputSchema,
  securityBriefItemInputSchema,
  type SecurityBriefInput,
  type SecurityBriefItemInput,
} from "./security-news";

const headedItem: SecurityBriefItemInput = {
  section: "ACTIVELY_EXPLOITED",
  product: "PHP",
  title: "unauthenticated remote code execution",
  advisoryIds: ["CVE-2026-109618", "CVE-2026-109619"],
  severity: "CRITICAL",
  cvssScore: 9.2,
  cvssVersion: "4.0",
  exploitationStatus: "exploited before the patch shipped",
  kevAddedOn: "2026-10-26",
  affected: "PHP 8.2 before 8.2.35, 8.3 before 8.3.36",
  fix: "upgrade to 8.2.35 or 8.3.36",
  publishedOn: "2026-10-21",
  whyItMatters: "The bug is in PHP itself, so every PHP site is exposed.",
  isUpdate: false,
  updateNote: null,
  sources: [
    { label: "CISA alert", url: "https://www.cisa.gov/example" },
    { label: "Vendor", url: "http://php.net/example" },
  ],
};

const worthKnowingItem: SecurityBriefItemInput = {
  section: "WORTH_KNOWING",
  product: "Chrome",
  title: "stable channel update fixes three high-severity bugs",
  advisoryIds: [],
  severity: null,
  cvssScore: null,
  cvssVersion: null,
  exploitationStatus: null,
  kevAddedOn: null,
  affected: null,
  fix: null,
  publishedOn: null,
  whyItMatters: null,
  isUpdate: false,
  updateNote: null,
  sources: [{ label: "Chrome releases", url: "https://chromereleases.googleblog.com/example" }],
};

const brief: SecurityBriefInput = {
  runOn: "2026-10-30",
  coversFrom: "2026-10-23",
  coversTo: "2026-10-30",
  mostUrgent: "PHP CVE-2026-109618: unauthenticated RCE in PHP itself",
  markdown: "# Security News\n\n...",
  items: [
    headedItem,
    { ...headedItem, section: "CRITICAL_AND_HIGH", product: "GitLab" },
    worthKnowingItem,
  ],
};

/** The path of the first issue, for asserting where a parse failed. */
function firstIssuePath(
  input: unknown,
  schema: z.ZodType = securityBriefInputSchema,
): PropertyKey[] | undefined {
  const result = schema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.path;
}

describe("securityBriefInputSchema", () => {
  it("accepts a full brief and trims text", () => {
    const parsed = securityBriefInputSchema.parse({
      ...brief,
      mostUrgent: `  ${brief.mostUrgent}  `,
    });
    expect(parsed.mostUrgent).toBe(brief.mostUrgent);
    expect(parsed.items).toHaveLength(3);
  });

  it("accepts a brief with no items", () => {
    expect(securityBriefInputSchema.safeParse({ ...brief, items: [] }).success).toBe(true);
  });

  it("rejects unknown keys", () => {
    expect(firstIssuePath({ ...brief, extra: 1 })).toEqual([]);
    expect(firstIssuePath({ ...brief, items: [{ ...headedItem, cvss: 9 }] })).toEqual(["items", 0]);
  });

  it("rejects a window that ends after it ran or starts after it ends", () => {
    expect(firstIssuePath({ ...brief, coversTo: "2026-10-31" })).toEqual(["coversTo"]);
    expect(firstIssuePath({ ...brief, coversFrom: "2026-10-31", coversTo: "2026-10-30" })).toEqual([
      "coversTo",
    ]);
  });

  it("rejects malformed dates", () => {
    expect(firstIssuePath({ ...brief, runOn: "2026-13-01" })).toEqual(["runOn"]);
    expect(firstIssuePath({ ...brief, coversFrom: "2026-10-5" })).toEqual(["coversFrom"]);
    expect(firstIssuePath({ ...brief, runOn: "2026-10-30T00:00:00Z" })).toEqual(["runOn"]);
  });

  it("rejects an empty mostUrgent or markdown", () => {
    expect(firstIssuePath({ ...brief, mostUrgent: " " })).toEqual(["mostUrgent"]);
    expect(firstIssuePath({ ...brief, markdown: "" })).toEqual(["markdown"]);
  });
});

describe("securityBriefItemInputSchema", () => {
  const item = securityBriefItemInputSchema;

  it("accepts headed and Worth Knowing items", () => {
    expect(item.safeParse(headedItem).success).toBe(true);
    expect(item.safeParse(worthKnowingItem).success).toBe(true);
  });

  it.each(["severity", "affected", "fix", "publishedOn", "whyItMatters"] as const)(
    "requires %s outside Worth Knowing",
    (field) => {
      expect(firstIssuePath({ ...headedItem, [field]: null }, item)).toEqual([field]);
      expect(
        firstIssuePath({ ...headedItem, section: "CRITICAL_AND_HIGH", [field]: null }, item),
      ).toEqual([field]);
    },
  );

  it("accepts every severity and rejects unknown sections and severities", () => {
    for (const severity of ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const) {
      expect(item.safeParse({ ...headedItem, severity }).success).toBe(true);
    }
    expect(firstIssuePath({ ...headedItem, section: "Actively Exploited" }, item)).toEqual([
      "section",
    ]);
    expect(firstIssuePath({ ...headedItem, severity: "Critical" }, item)).toEqual(["severity"]);
  });

  it("needs an update note when marked as an update", () => {
    expect(firstIssuePath({ ...headedItem, isUpdate: true }, item)).toEqual(["updateNote"]);
    expect(
      item.safeParse({ ...headedItem, isUpdate: true, updateNote: "fix released" }).success,
    ).toBe(true);
  });

  it("validates the CVSS score and version", () => {
    expect(firstIssuePath({ ...headedItem, cvssScore: 10.1 }, item)).toEqual(["cvssScore"]);
    expect(firstIssuePath({ ...headedItem, cvssScore: -1 }, item)).toEqual(["cvssScore"]);
    expect(firstIssuePath({ ...headedItem, cvssVersion: "v4" }, item)).toEqual(["cvssVersion"]);
    expect(firstIssuePath({ ...headedItem, cvssScore: null }, item)).toEqual(["cvssVersion"]);
    expect(item.safeParse({ ...headedItem, cvssScore: null, cvssVersion: null }).success).toBe(
      true,
    );
  });

  it("requires at least one http(s) source", () => {
    expect(firstIssuePath({ ...headedItem, sources: [] }, item)).toEqual(["sources"]);
    expect(
      firstIssuePath(
        { ...headedItem, sources: [{ label: "x", url: "ftp://example.com/a" }] },
        item,
      ),
    ).toEqual(["sources", 0, "url"]);
    expect(
      firstIssuePath({ ...headedItem, sources: [{ label: "x", url: "not a url" }] }, item),
    ).toEqual(["sources", 0, "url"]);
    expect(
      firstIssuePath(
        { ...headedItem, sources: [{ label: " ", url: "https://example.com" }] },
        item,
      ),
    ).toEqual(["sources", 0, "label"]);
  });

  it("validates advisory ids", () => {
    expect(firstIssuePath({ ...headedItem, advisoryIds: ["cve-2026-1"] }, item)).toEqual([
      "advisoryIds",
      0,
    ]);
    expect(
      item.safeParse({ ...headedItem, advisoryIds: ["CVE-2026-12345", "GHSA-4w2v-q235-vp99"] })
        .success,
    ).toBe(true);
  });
});

describe("advisoryIdSchema", () => {
  it.each(["CVE-2026-1234", "CVE-2026-1234567", "GHSA-4w2v-q235-vp99", " CVE-2026-1234 "])(
    "accepts %s",
    (id) => {
      expect(advisoryIdSchema.safeParse(id).success).toBe(true);
    },
  );

  it.each(["CVE-2026-123", "CVE-26-1234", "GHSA-4w2v-q235", "GHSA-abcd-abcd-abcd", "PHP2Shell"])(
    "rejects %s",
    (id) => {
      expect(advisoryIdSchema.safeParse(id).success).toBe(false);
    },
  );
});
