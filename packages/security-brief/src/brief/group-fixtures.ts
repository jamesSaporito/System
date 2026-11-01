import type { SecurityBriefItemWriting } from "../api/brief";
import type { Advisory, KevEntry, NewsItem } from "../feeds/feeds";
import type { StoredEntry } from "./group";

// Stored entries and model replies for the grouping and run tests.

export const TODAY = "2026-10-31";

export const kev = (cve: string, overrides: Partial<KevEntry> = {}): StoredEntry => ({
  id: `kev-${cve}`,
  source: "KEV",
  externalId: cve,
  advisoryIds: [cve],
  publishedOn: overrides.dateAdded ?? "2026-10-30",
  data: {
    cve,
    vendor: "PHP Group",
    product: "PHP",
    name: "PHP Memory Corruption Vulnerability",
    description: "PHP contains a memory corruption vulnerability.",
    requiredAction: "Apply mitigations per vendor instructions.",
    dateAdded: "2026-10-30",
    dueDate: "2026-11-20",
    ransomware: false,
    urls: [`https://nvd.nist.gov/vuln/detail/${cve}`],
    ...overrides,
  },
});

export const advisory = (
  ghsa: string,
  cve: string | null,
  overrides: Partial<Advisory> = {},
): StoredEntry => ({
  id: `gh-${ghsa}`,
  source: "GITHUB",
  externalId: ghsa,
  advisoryIds: cve ? [cve, ghsa] : [ghsa],
  publishedOn: overrides.publishedOn ?? "2026-10-30",
  data: {
    ghsa,
    cve,
    summary: "Remote code execution",
    severity: "critical",
    cvssScore: 9.8,
    cvssVersion: "3.1",
    packages: [{ ecosystem: "npm", name: "example", vulnerable: "< 2.0.0", patched: "2.0.0" }],
    publishedOn: "2026-10-30",
    url: `https://github.com/advisories/${ghsa}`,
    ...overrides,
  },
});

export const news = (
  slug: string,
  cves: string[],
  overrides: Partial<NewsItem> = {},
): StoredEntry => {
  const url = `https://www.news.example.com/${slug}/`;
  return {
    id: `news-${slug}`,
    source: "NEWS",
    externalId: url,
    advisoryIds: cves,
    publishedOn: overrides.publishedOn ?? "2026-10-31",
    data: {
      site: "www.news.example.com",
      title: `Story ${slug}`,
      url,
      publishedOn: "2026-10-31",
      summary: "A security story.",
      cves,
      ...overrides,
    },
  };
};

/** What the model writes for one group. */
export const writing = (
  id: string,
  overrides: Partial<SecurityBriefItemWriting> = {},
): SecurityBriefItemWriting => ({
  id,
  subject: "PHP",
  title: "Remote code execution",
  exploitationStatus: null,
  exploitedInTheWild: false,
  affected: "PHP 8.3 before 8.3.36",
  fix: "Upgrade to 8.3.36",
  impact: "Every PHP site.",
  ...overrides,
});
