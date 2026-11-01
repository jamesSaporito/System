import { describe, expect, it } from "vitest";
import type { z } from "zod";

import {
  advisoryIdSchema,
  securityBriefItemInputSchema,
  type SecurityBriefItemInput,
  securityBriefItemWritingSchema,
  type SecurityBriefItemWriting,
  securityBriefWritingSchema,
} from "./brief";

const item: SecurityBriefItemInput = {
  section: "ACTIVELY_EXPLOITED",
  subject: "PHP",
  title: "Unauthenticated remote code execution",
  advisoryIds: ["CVE-2026-109618", "CVE-2026-109619"],
  severity: "CRITICAL",
  cvssScore: 9.2,
  cvssVersion: "4.0",
  exploitationStatus: "Exploited before the patch shipped",
  exploitedInTheWild: true,
  kevAddedOn: "2026-10-26",
  affected: "PHP 8.2 before 8.2.35, 8.3 before 8.3.36",
  fix: "Upgrade to 8.2.35 or 8.3.36",
  publishedOn: "2026-10-21",
  impact: "The bug is in PHP itself, so every PHP site is exposed.",
  updateNote: null,
  sources: [
    { label: "CISA KEV", url: "https://nvd.nist.gov/vuln/detail/CVE-2026-109618" },
    { label: "bleepingcomputer.com", url: "http://www.bleepingcomputer.com/example" },
  ],
};

const written: SecurityBriefItemWriting = {
  id: "g1",
  subject: "npm",
  title: "Malicious packages steal tokens",
  exploitationStatus: null,
  exploitedInTheWild: false,
  affected: null,
  fix: null,
  impact: "Anyone who installed them.",
};

/** The path of the first issue, for asserting where a parse failed. */
function firstIssuePath(
  input: unknown,
  schema: z.ZodType = securityBriefItemInputSchema,
): PropertyKey[] | undefined {
  const result = schema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.path;
}

describe("securityBriefItemInputSchema", () => {
  it("accepts a full item, and a news-only one with nothing but text and a source", () => {
    expect(securityBriefItemInputSchema.safeParse(item).success).toBe(true);
    const newsOnly = {
      ...item,
      section: "WORTH_KNOWING",
      advisoryIds: [],
      severity: null,
      cvssScore: null,
      cvssVersion: null,
      exploitationStatus: null,
      exploitedInTheWild: false,
      kevAddedOn: null,
      affected: null,
      fix: null,
      publishedOn: null,
      impact: null,
    };
    expect(securityBriefItemInputSchema.safeParse(newsOnly).success).toBe(true);
  });

  it("rejects unknown keys and unknown sections and severities", () => {
    expect(firstIssuePath({ ...item, cvss: 9 })).toEqual([]);
    expect(firstIssuePath({ ...item, section: "Actively Exploited" })).toEqual(["section"]);
    expect(firstIssuePath({ ...item, severity: "Critical" })).toEqual(["severity"]);
  });

  it.each(["title", "exploitationStatus", "affected", "fix", "impact", "updateNote"] as const)(
    "requires %s to start with a capital letter",
    (field) => {
      expect(firstIssuePath({ ...item, [field]: "lowercase start" })).toEqual([field]);
    },
  );

  it("lets the subject keep its own styling", () => {
    expect(securityBriefItemInputSchema.safeParse({ ...item, subject: "npm" }).success).toBe(true);
  });

  it("validates the CVSS score and version", () => {
    expect(firstIssuePath({ ...item, cvssScore: 10.1 })).toEqual(["cvssScore"]);
    expect(firstIssuePath({ ...item, cvssVersion: "v4" })).toEqual(["cvssVersion"]);
    expect(firstIssuePath({ ...item, cvssScore: null })).toEqual(["cvssVersion"]);
  });

  it("validates dates", () => {
    expect(firstIssuePath({ ...item, kevAddedOn: "2026-13-01" })).toEqual(["kevAddedOn"]);
    expect(firstIssuePath({ ...item, publishedOn: "2026-10-21T00:00:00Z" })).toEqual([
      "publishedOn",
    ]);
  });

  it("requires at least one http(s) source with a label", () => {
    expect(firstIssuePath({ ...item, sources: [] })).toEqual(["sources"]);
    expect(
      firstIssuePath({ ...item, sources: [{ label: "X", url: "ftp://example.com" }] }),
    ).toEqual(["sources", 0, "url"]);
    expect(
      firstIssuePath({ ...item, sources: [{ label: " ", url: "https://example.com" }] }),
    ).toEqual(["sources", 0, "label"]);
  });

  it("validates advisory ids", () => {
    expect(firstIssuePath({ ...item, advisoryIds: ["cve-2026-1"] })).toEqual(["advisoryIds", 0]);
  });
});

describe("securityBriefItemWritingSchema", () => {
  it("takes the model's text and the exploitation flag, and nothing else", () => {
    expect(securityBriefItemWritingSchema.safeParse(written).success).toBe(true);
    expect(
      firstIssuePath({ ...written, section: "WORTH_KNOWING" }, securityBriefItemWritingSchema),
    ).toEqual([]);
    expect(firstIssuePath({ ...written, sources: [] }, securityBriefItemWritingSchema)).toEqual([]);
  });

  it("requires capitalised text and the flag", () => {
    expect(
      firstIssuePath({ ...written, title: "lowercase" }, securityBriefItemWritingSchema),
    ).toEqual(["title"]);
    expect(
      firstIssuePath({ ...written, exploitedInTheWild: undefined }, securityBriefItemWritingSchema),
    ).toEqual(["exploitedInTheWild"]);
  });

  it("wraps the items in an object, as structured output requires", () => {
    expect(securityBriefWritingSchema.safeParse({ items: [written] }).success).toBe(true);
    expect(securityBriefWritingSchema.safeParse([written]).success).toBe(false);
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
