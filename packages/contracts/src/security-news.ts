import { z } from "zod";

// The daily security news brief, as the security-news skill writes it: a header (run date, window
// covered, most urgent item), headed items under "Actively Exploited" and "Critical and High", and
// one-liners under "Worth Knowing". The input schemas validate what the generator produces; they
// are strict so a misnamed field fails instead of being dropped.
//
// Enum literals match the Prisma enums in packages/db (SecurityBriefSection, SecuritySeverity) so
// values go to and from the database without a mapping; a db test keeps them in sync.

/** The brief's sections, in reading order. */
export const securityBriefSectionSchema = z.enum([
  "ACTIVELY_EXPLOITED",
  "CRITICAL_AND_HIGH",
  "WORTH_KNOWING",
]);
export type SecurityBriefSection = z.infer<typeof securityBriefSectionSchema>;

export const securitySeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export type SecuritySeverity = z.infer<typeof securitySeveritySchema>;

/** A calendar date as YYYY-MM-DD; briefs have no times of day. */
const calendarDateSchema = z.iso.date();

/** A CVE id (CVE-YYYY-NNNN…) or a GitHub advisory id (GHSA-xxxx-xxxx-xxxx). */
export const advisoryIdSchema = z
  .string()
  .trim()
  .regex(
    /^(?:CVE-\d{4}-\d{4,}|GHSA(?:-[23456789cfghjmpqrvwx]{4}){3})$/,
    "a CVE or GHSA id like CVE-2026-12345 or GHSA-xxxx-xxxx-xxxx",
  );

export const securitySourceSchema = z.strictObject({
  label: z.string().trim().min(1),
  url: z.url({ protocol: /^https?$/ }),
});
export type SecuritySource = z.infer<typeof securitySourceSchema>;

const HEADED_ITEM_FIELDS = ["severity", "affected", "fix", "publishedOn", "whyItMatters"] as const;

/**
 * One item of a brief. Everything beyond product, title, advisoryIds and sources is null on
 * "Worth Knowing" items and required on the others.
 */
export const securityBriefItemInputSchema = z
  .strictObject({
    section: securityBriefSectionSchema,
    product: z.string().trim().min(1),
    /** What the flaw lets an attacker do; the whole line for "Worth Knowing" items. */
    title: z.string().trim().min(1),
    advisoryIds: z.array(advisoryIdSchema),
    severity: securitySeveritySchema.nullable(),
    cvssScore: z.number().min(0).max(10).nullable(),
    /** CVSS version the score is on, e.g. "4.0". */
    cvssVersion: z
      .string()
      .regex(/^\d\.\d$/, "a CVSS version like 3.1")
      .nullable(),
    /** Prose from the Severity line, e.g. "exploited in the wild since 2026-10-20". */
    exploitationStatus: z.string().trim().min(1).nullable(),
    /** Date it entered CISA's KEV catalog, when known. */
    kevAddedOn: calendarDateSchema.nullable(),
    affected: z.string().trim().min(1).nullable(),
    fix: z.string().trim().min(1).nullable(),
    publishedOn: calendarDateSchema.nullable(),
    whyItMatters: z.string().trim().min(1).nullable(),
    /** Carried over from the previous brief with a change; updateNote says what changed. */
    isUpdate: z.boolean(),
    updateNote: z.string().trim().min(1).nullable(),
    sources: z.array(securitySourceSchema).min(1),
  })
  .superRefine((item, ctx) => {
    if (item.section !== "WORTH_KNOWING") {
      for (const field of HEADED_ITEM_FIELDS) {
        if (item[field] === null) {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: "required outside Worth Knowing",
          });
        }
      }
    }
    if (item.cvssVersion !== null && item.cvssScore === null) {
      ctx.addIssue({ code: "custom", path: ["cvssVersion"], message: "needs a cvssScore" });
    }
    if (item.isUpdate && item.updateNote === null) {
      ctx.addIssue({ code: "custom", path: ["updateNote"], message: "say what changed" });
    }
  });
export type SecurityBriefItemInput = z.infer<typeof securityBriefItemInputSchema>;

/** A whole brief as the daily run produces it. `items` is in reading order within each section. */
export const securityBriefInputSchema = z
  .strictObject({
    /** The day it ran. */
    runOn: calendarDateSchema,
    /** Window covered, inclusive. */
    coversFrom: calendarDateSchema,
    coversTo: calendarDateSchema,
    /** "<Product> <CVE-ID>: <why>" or "Nothing critical". */
    mostUrgent: z.string().trim().min(1),
    /** The full brief as Markdown, as written. */
    markdown: z.string().trim().min(1),
    items: z.array(securityBriefItemInputSchema),
  })
  .superRefine((brief, ctx) => {
    // ISO dates compare correctly as strings.
    if (brief.coversFrom > brief.coversTo) {
      ctx.addIssue({ code: "custom", path: ["coversTo"], message: "before coversFrom" });
    }
    if (brief.coversTo > brief.runOn) {
      ctx.addIssue({ code: "custom", path: ["coversTo"], message: "after runOn" });
    }
  });
export type SecurityBriefInput = z.infer<typeof securityBriefInputSchema>;

// Responses. Calendar dates are YYYY-MM-DD; timestamps are ISO strings.

export type SecurityBriefItem = SecurityBriefItemInput & {
  id: string;
  /** 0-based order within the section. */
  position: number;
};

/** One row of the briefs list (newest first). */
export type SecurityBriefSummary = {
  id: string;
  runOn: string;
  coversFrom: string;
  coversTo: string;
  mostUrgent: string;
  itemCount: number;
  updatedAt: string;
};
export type SecurityBriefsResponse = { briefs: SecurityBriefSummary[] };

export type SecurityBrief = Omit<SecurityBriefSummary, "itemCount"> & {
  markdown: string;
  /** Ordered by section (reading order), then position. */
  items: SecurityBriefItem[];
  createdAt: string;
};
