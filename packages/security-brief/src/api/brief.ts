import { z } from "zod";

// The security news brief. Feed entries (CISA KEV, GitHub advisories, news articles) are stored
// as fetched and grouped by CVE in code; the model only writes each group's text
// (securityBriefItemWritingSchema), and the code fills in everything else to make the stored item
// (securityBriefItemInputSchema). The schemas are strict so a misnamed field fails instead of
// being dropped.
//
// Enum literals match the Prisma enums in packages/db (SecurityBriefSection, SecuritySeverity) so
// values go to and from the database without a mapping; a backend storage test keeps them in sync.

/** The brief's sections, in reading order. */
export const securityBriefSectionSchema = z.enum([
  "ACTIVELY_EXPLOITED",
  "CRITICAL_AND_HIGH",
  "WORTH_KNOWING",
]);
export type SecurityBriefSection = z.infer<typeof securityBriefSectionSchema>;

export const securitySeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export type SecuritySeverity = z.infer<typeof securitySeveritySchema>;

/** Readable text, which starts with a capital letter (names styled in lowercase are reworded). */
export const sentenceSchema = z
  .string()
  .trim()
  .min(1)
  .refine((text) => !/^\p{Ll}/u.test(text), "start with a capital letter");

/** A calendar date as YYYY-MM-DD. */
const calendarDateSchema = z.iso.date();

/** A CVE id (CVE-YYYY-NNNN…) or a GitHub advisory id (GHSA-xxxx-xxxx-xxxx). */
export const advisoryIdSchema = z
  .string()
  .trim()
  .regex(
    /^(?:CVE-\d{4}-\d{4,}|GHSA(?:-[23456789cfghjmpqrvwx]{4}){3})$/,
    "a CVE or GHSA id like CVE-2026-12345 or GHSA-xxxx-xxxx-xxxx",
  );

/** A link to one of the item's entries; the label names the source ("CISA KEV", a news site). */
export const securitySourceSchema = z.strictObject({
  label: z.string().trim().min(1),
  url: z.url({ protocol: /^https?$/ }),
});
export type SecuritySource = z.infer<typeof securitySourceSchema>;

/**
 * What the model writes for one group of entries, and nothing more: it doesn't choose, order,
 * section, date or link anything. `id` is the group id the request gave.
 */
export const securityBriefItemWritingSchema = z.strictObject({
  id: z.string().min(1),
  /** The affected product or project, as its vendor names it (its own styling, e.g. "npm"). */
  subject: z.string().trim().min(1),
  /** What the flaw lets an attacker do. */
  title: sentenceSchema,
  /** What the entries say about exploitation, in a sentence; null if they say nothing. */
  exploitationStatus: sentenceSchema.nullable(),
  /** True only when an entry says it's exploited in the wild. */
  exploitedInTheWild: z.boolean(),
  affected: sentenceSchema.nullable(),
  fix: sentenceSchema.nullable(),
  /** Who is affected and how exposed they are. */
  impact: sentenceSchema.nullable(),
});
export type SecurityBriefItemWriting = z.infer<typeof securityBriefItemWritingSchema>;

/** The model's whole reply: one written item per group in the request. */
export const securityBriefWritingSchema = z.strictObject({
  items: z.array(securityBriefItemWritingSchema),
});
export type SecurityBriefWriting = z.infer<typeof securityBriefWritingSchema>;

/** A stored item: the model's text plus what the code derives from the item's entries. */
export const securityBriefItemInputSchema = z
  .strictObject({
    section: securityBriefSectionSchema,
    subject: z.string().trim().min(1),
    title: sentenceSchema,
    advisoryIds: z.array(advisoryIdSchema),
    severity: securitySeveritySchema.nullable(),
    cvssScore: z.number().min(0).max(10).nullable(),
    /** CVSS version the score is on, e.g. "4.0". */
    cvssVersion: z
      .string()
      .regex(/^\d\.\d$/, "a CVSS version like 3.1")
      .nullable(),
    exploitationStatus: sentenceSchema.nullable(),
    exploitedInTheWild: z.boolean(),
    /** Date it entered CISA's KEV catalog. */
    kevAddedOn: calendarDateSchema.nullable(),
    affected: sentenceSchema.nullable(),
    fix: sentenceSchema.nullable(),
    /** The earliest date its entries give. */
    publishedOn: calendarDateSchema.nullable(),
    impact: sentenceSchema.nullable(),
    /** What the latest update added, e.g. "Added to CISA KEV"; null until it's updated. */
    updateNote: sentenceSchema.nullable(),
    sources: z.array(securitySourceSchema).min(1),
  })
  .superRefine((item, ctx) => {
    if (item.cvssVersion !== null && item.cvssScore === null) {
      ctx.addIssue({ code: "custom", path: ["cvssVersion"], message: "needs a cvssScore" });
    }
  });
export type SecurityBriefItemInput = z.infer<typeof securityBriefItemInputSchema>;

// Responses. Calendar dates are YYYY-MM-DD; timestamps are ISO strings.

export type SecurityBriefItem = SecurityBriefItemInput & {
  id: string;
  firstSeenOn: string;
  /** The day a later entry last updated it; null if never. */
  updatedOn: string | null;
  /** Listed on this day because it was updated, not first seen. */
  isUpdate: boolean;
};

/** A day with items: first seen that day, or updated that day. */
export type SecurityBriefDay = { day: string; itemCount: number; updatedCount: number };

/** `GET /security-briefs`: the days with items, newest first. */
export type SecurityBriefDaysResponse = { days: SecurityBriefDay[] };

/**
 * `GET /security-briefs/:day`: that day's items, by section (reading order), then severity, CVSS
 * score, newest first, and subject.
 */
export type SecurityBriefDayResponse = { day: string; items: SecurityBriefItem[] };

/** `POST /security-briefs/run` (admins only). */
export const runSecurityBriefSchema = z.strictObject({
  /** Read at least the last 24 hours of every source, whatever its cursor says. */
  fullDay: z.boolean().default(false),
});
export type RunSecurityBriefInput = z.infer<typeof runSecurityBriefSchema>;

/** How a finished run ended; literals match the Prisma enum SecurityBriefRunOutcome. */
export const securityBriefRunOutcomeSchema = z.enum(["STORED", "NOTHING_NEW", "FAILED"]);
export type SecurityBriefRunOutcome = z.infer<typeof securityBriefRunOutcomeSchema>;

/** `GET /security-briefs/status` (admins only): the run in progress, and how the last one ended. */
export type SecurityBriefStatusResponse = {
  /** Null when no run is going. */
  running: { startedAt: string } | null;
  /** The newest entry in security_brief_runs; null before the first run. */
  lastRun: {
    runOn: string;
    outcome: SecurityBriefRunOutcome;
    /** Why it failed; null otherwise. */
    error: string | null;
    /** Entries fetched that weren't stored before. */
    newEntries: number;
    newItems: number;
    updatedItems: number;
    finishedAt: string;
  } | null;
};
