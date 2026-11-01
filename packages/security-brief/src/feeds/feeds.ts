import { z } from "zod";

// What the brief reads, all free and structured: CISA's catalog of vulnerabilities known to be
// exploited (KEV), GitHub's reviewed advisories, and the news sites' RSS/Atom feeds. Each source
// is read from where it last stopped (its cursor), and every entry it gives is kept: nothing is
// capped or chosen here, so the brief can't silently miss one.

/** `fetch`'s shape; tests pass a fake. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** CISA's own copy of the KEV catalog on GitHub, updated with every catalog release. */
// https://github.com/cisagov/kev-data
export const KEV_URL =
  "https://raw.githubusercontent.com/cisagov/kev-data/main/known_exploited_vulnerabilities.json";

/** GitHub's global advisories endpoint (reviewed advisories, all ecosystems; no token needed). */
export const ADVISORIES_URL = "https://api.github.com/advisories";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "portfolio-security-brief";
const MAX_SUMMARY = 300;
/** A source's first read goes back this far. */
export const FIRST_READ_MS = 24 * 60 * 60 * 1000;
/** Each later read starts this much before the cursor, so nothing published at the edge is lost. */
export const OVERLAP_MS = 60 * 60 * 1000;
/** GitHub's largest page. */
const PAGE_SIZE = 100;
/**
 * A stop for a paging bug, far above a real day (tens of advisories). Hitting it fails the
 * source, which keeps its cursor, rather than storing part of the list.
 */
const MAX_PAGES = 20;
/**
 * The most entries one source adds per run, to keep the brief's noise down: each news feed's
 * newest security articles, KEV's newest additions, and GitHub's critical advisories before high
 * ones, newest first. The rest are skipped for good (the source's cursor still moves). This also
 * bounds what a run catching up after a long gap sends to the model.
 */
export const MAX_ENTRIES_PER_SOURCE = 10;

// Entries as stored (security_feed_entries.data); the schemas read them back from the database.

export const kevEntrySchema = z.object({
  cve: z.string(),
  vendor: z.string(),
  product: z.string(),
  name: z.string(),
  description: z.string(),
  requiredAction: z.string(),
  dateAdded: z.string(),
  dueDate: z.string(),
  ransomware: z.boolean(),
  /** The NVD record, then any links in the entry's notes. */
  urls: z.array(z.string()),
});
/** A KEV entry: CISA has seen it exploited. */
export type KevEntry = z.infer<typeof kevEntrySchema>;

export const advisorySchema = z.object({
  ghsa: z.string(),
  cve: z.string().nullable(),
  summary: z.string(),
  severity: z.enum(["critical", "high"]),
  cvssScore: z.number().nullable(),
  cvssVersion: z.string().nullable(),
  packages: z.array(
    z.object({
      ecosystem: z.string(),
      name: z.string(),
      vulnerable: z.string(),
      patched: z.string().nullable(),
    }),
  ),
  publishedOn: z.string(),
  url: z.string(),
});
export type Advisory = z.infer<typeof advisorySchema>;

export const newsItemSchema = z.object({
  /** The feed's host, e.g. www.bleepingcomputer.com. */
  site: z.string(),
  title: z.string(),
  url: z.string(),
  publishedOn: z.string(),
  summary: z.string(),
  cves: z.array(z.string()),
});
export type NewsItem = z.infer<typeof newsItemSchema>;

/** An entry to store; `externalId` is what makes it the same entry when it's read again. */
export type CollectedEntry = { externalId: string; advisoryIds: string[]; publishedOn: string } & (
  | { source: "KEV"; data: KevEntry }
  | { source: "GITHUB"; data: Advisory }
  | { source: "NEWS"; data: NewsItem }
);

export type FeedFailure = { source: string; reason: string };

/** Where each source was last read up to; null when it never was. */
export type FeedCursors = {
  kev: Date | null;
  advisories: Date | null;
  feeds: { url: string; fetchedAt: Date | null }[];
};

export type FeedCollection = {
  entries: CollectedEntry[];
  /** The sources read in full, whose cursors move to the read's start. */
  read: { kev: boolean; advisories: boolean; feeds: string[] };
  failures: FeedFailure[];
};

const kevSchema = z.object({
  vulnerabilities: z.array(
    z.object({
      cveID: z.string(),
      vendorProject: z.string(),
      product: z.string(),
      vulnerabilityName: z.string(),
      dateAdded: z.string(),
      shortDescription: z.string(),
      requiredAction: z.string(),
      dueDate: z.string(),
      knownRansomwareCampaignUse: z.string(),
      notes: z.string().default(""),
    }),
  ),
});

const cvssSchema = z.object({ score: z.number().nullable(), vector_string: z.string().nullable() });

const advisoriesSchema = z.array(
  z.object({
    ghsa_id: z.string(),
    cve_id: z.string().nullable(),
    html_url: z.string(),
    summary: z.string(),
    severity: z.string(),
    published_at: z.string(),
    withdrawn_at: z.string().nullable(),
    cvss_severities: z
      .object({ cvss_v3: cvssSchema.nullish(), cvss_v4: cvssSchema.nullish() })
      .nullish(),
    vulnerabilities: z
      .array(
        z.object({
          package: z.object({ ecosystem: z.string(), name: z.string() }).nullable(),
          vulnerable_version_range: z.string().nullable(),
          first_patched_version: z.string().nullable(),
        }),
      )
      .nullable(),
  }),
);

async function fetchOk(fetch: FetchLike, url: string, accept: string): Promise<Response> {
  const response = await fetch(url, {
    headers: { Accept: accept, "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

const dayOf = (date: Date) => date.toISOString().slice(0, 10);

/** KEV entries added on or after `since`'s day (KEV only gives a date). */
export function kevEntries(json: unknown, since: Date): KevEntry[] {
  const from = dayOf(since);
  return kevSchema
    .parse(json)
    .vulnerabilities.filter((entry) => entry.dateAdded >= from)
    .map((entry) => ({
      cve: entry.cveID,
      vendor: entry.vendorProject,
      product: entry.product,
      name: entry.vulnerabilityName,
      description: entry.shortDescription,
      requiredAction: entry.requiredAction,
      dateAdded: entry.dateAdded,
      dueDate: entry.dueDate,
      ransomware: entry.knownRansomwareCampaignUse === "Known",
      urls: [`https://nvd.nist.gov/vuln/detail/${entry.cveID}`, ...urlsIn(entry.notes)],
    }));
}

/** The advisories of one severity published at or after `since`, without withdrawn ones. */
export function advisoryEntries(
  json: unknown,
  severity: Advisory["severity"],
  since: Date,
): Advisory[] {
  return advisoriesSchema
    .parse(json)
    .filter(
      (advisory) => advisory.withdrawn_at === null && new Date(advisory.published_at) >= since,
    )
    .map((advisory) => {
      const { score, version } = cvssOf(advisory.cvss_severities);
      return {
        ghsa: advisory.ghsa_id,
        cve: advisory.cve_id,
        summary: clean(advisory.summary),
        severity,
        cvssScore: score,
        cvssVersion: version,
        packages: (advisory.vulnerabilities ?? []).flatMap((vulnerability) =>
          vulnerability.package
            ? [
                {
                  ecosystem: vulnerability.package.ecosystem,
                  name: vulnerability.package.name,
                  vulnerable: vulnerability.vulnerable_version_range ?? "unknown versions",
                  patched: vulnerability.first_patched_version,
                },
              ]
            : [],
        ),
        publishedOn: advisory.published_at.slice(0, 10),
        url: advisory.html_url,
      };
    });
}

/** The newer CVSS score that's set (GitHub reports a v4 score of 0 when there's none). */
function cvssOf(severities: z.infer<typeof advisoriesSchema>[number]["cvss_severities"]): {
  score: number | null;
  version: string | null;
} {
  for (const cvss of [severities?.cvss_v4, severities?.cvss_v3]) {
    if (cvss?.score) {
      const version = /^CVSS:(\d\.\d)/.exec(cvss.vector_string ?? "")?.[1] ?? null;
      return { score: cvss.score, version };
    }
  }
  return { score: null, version: null };
}

/** The `rel="next"` URL of a GitHub `Link` header, if there is one. */
export function nextPage(link: string | null): string | null {
  for (const part of link?.split(",") ?? []) {
    const match = /<([^>]+)>\s*;\s*rel="next"/.exec(part);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Every reviewed advisory of one severity published since `since`, following GitHub's pages. */
async function readAdvisories(
  fetch: FetchLike,
  severity: Advisory["severity"],
  since: Date,
): Promise<Advisory[]> {
  const query = new URLSearchParams({
    type: "reviewed",
    severity,
    published: `>=${dayOf(since)}`,
    per_page: String(PAGE_SIZE),
  });
  let url: string | null = `${ADVISORIES_URL}?${query.toString()}`;
  const advisories: Advisory[] = [];
  for (let page = 1; url !== null; page += 1) {
    if (page > MAX_PAGES) throw new Error(`More than ${MAX_PAGES} pages of ${severity} advisories`);
    const response = await fetchOk(fetch, url, "application/vnd.github+json");
    advisories.push(...advisoryEntries(await response.json(), severity, since));
    url = nextPage(response.headers.get("link"));
  }
  return advisories;
}

// News: a small RSS 2.0 and Atom reader. Feeds are simple enough that a parser package isn't
// worth adding; anything unexpected is skipped rather than guessed at.

/** Words that mark a news item as being about a vulnerability or an attack. */
const SECURITY_NEWS =
  /vulnerab|\bCVE-\d|exploit|zero[- ]day|\b0-day|\bpatch|\bflaws?\b|\bRCE\b|remote code|ransomware|supply[- ]chain|malicious (?:package|npm|pypi|extension|update)|backdoor|advisory|security update/i;

const CVE = /CVE-\d{4}-\d{4,}/gi;

export type FeedEntry = { title: string; url: string; published: Date | null; summary: string };

/** The items of an RSS 2.0 feed or the entries of an Atom feed. */
export function parseFeed(xml: string): FeedEntry[] {
  const blocks = xml.match(/<(item|entry)\b[^>]*>[\s\S]*?<\/\1>/g) ?? [];
  return blocks.flatMap((block) => {
    const title = clean(element(block, ["title"]) ?? "");
    const url = linkOf(block);
    if (!title || !url) return [];
    const date = element(block, ["pubDate", "published", "updated", "dc:date"]);
    const published = date ? new Date(clean(date)) : null;
    return [
      {
        title,
        url,
        published: published && !Number.isNaN(published.getTime()) ? published : null,
        summary: truncate(clean(element(block, ["description", "summary", "content"]) ?? "")),
      },
    ];
  });
}

/** The newest MAX_ENTRIES_PER_SOURCE security news items with a web link published at or after `since`. */
export function newsItems(site: string, entries: FeedEntry[], since: Date): NewsItem[] {
  return entries
    .flatMap((entry) => {
      const { published } = entry;
      if (!published || published < since || !isWebUrl(entry.url)) return [];
      return SECURITY_NEWS.test(`${entry.title} ${entry.summary}`) ? [{ entry, published }] : [];
    })
    .toSorted((a, b) => b.published.getTime() - a.published.getTime())
    .slice(0, MAX_ENTRIES_PER_SOURCE)
    .map(({ entry, published }) => {
      const text = `${entry.title} ${entry.summary}`;
      const cves = [...new Set((text.match(CVE) ?? []).map((id) => id.toUpperCase()))];
      return {
        site,
        title: entry.title,
        url: entry.url,
        publishedOn: dayOf(published),
        summary: entry.summary,
        cves,
      };
    });
}

function isWebUrl(url: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

/** The text of the first of `names` found in the block, still encoded. */
function element(block: string, names: string[]): string | null {
  for (const name of names) {
    const escaped = name.replace(":", "\\:");
    const match = new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)</${escaped}>`, "i").exec(block);
    if (match?.[1] !== undefined) return match[1];
  }
  return null;
}

/** RSS has the URL as the link's text; Atom has it in href, on the "alternate" link. */
function linkOf(block: string): string | null {
  const text = element(block, ["link"]);
  if (text?.trim()) return clean(text);
  const links = block.match(/<link\b[^>]*>/gi) ?? [];
  const alternate =
    links.find((link) => /rel=["']alternate["']/i.test(link)) ??
    links.find((link) => !/rel=/i.test(link));
  const href = alternate && /href=["']([^"']+)["']/i.exec(alternate)?.[1];
  return href ? decode(href) : null;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decode(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? entity;
  });
}

/** Plain text: CDATA unwrapped, entities decoded, tags dropped (summaries are often HTML). */
function clean(text: string): string {
  const unwrapped = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  // Decoded before and after removing tags, since feeds often escape their HTML.
  const withoutTags = decode(unwrapped).replace(/<[^>]*>/g, " ");
  return decode(withoutTags).replace(/\s+/g, " ").trim();
}

const truncate = (text: string) =>
  text.length > MAX_SUMMARY ? `${text.slice(0, MAX_SUMMARY).trimEnd()}…` : text;

const urlsIn = (text: string) => text.match(/https?:\/\/[^\s;,]+/g) ?? [];

const newestFirst = (advisories: Advisory[]) =>
  advisories.toSorted((a, b) => b.publishedOn.localeCompare(a.publishedOn));

/**
 * Where a source's read starts: just before its cursor, or 24 hours back on the first read.
 * `fullDay` reads at least the last 24 hours whatever the cursor says (an older cursor still
 * reads from there), for when stored records were cleared but the cursors weren't.
 */
export function readSince(cursor: Date | null, now: Date, fullDay = false): Date {
  const dayBack = now.getTime() - FIRST_READ_MS;
  const fromCursor = cursor ? cursor.getTime() - OVERLAP_MS : dayBack;
  return new Date(fullDay ? Math.min(fromCursor, dayBack) : fromCursor);
}

/**
 * Reads every source from its cursor. A source that fails is reported in `failures` and left
 * out of `read`, so its cursor stays and the next run reads it from the same point; the rest are
 * still used. Entries come back as stored, in a stable order.
 */
export async function collectFeeds(input: {
  fetch: FetchLike;
  now: Date;
  cursors: FeedCursors;
  /** Read at least the last 24 hours of every source (see readSince). */
  fullDay?: boolean;
}): Promise<FeedCollection> {
  const { fetch, now, cursors, fullDay = false } = input;
  const since = (cursor: Date | null) => readSince(cursor, now, fullDay);
  const failures: FeedFailure[] = [];

  const attempt = async <T>(source: string, read: () => Promise<T>): Promise<T | null> => {
    try {
      return await read();
    } catch (error) {
      failures.push({ source, reason: error instanceof Error ? error.message : String(error) });
      return null;
    }
  };

  const advisoriesSince = since(cursors.advisories);
  const [kev, advisories, ...news] = await Promise.all([
    attempt("CISA KEV", async () => {
      const response = await fetchOk(fetch, KEV_URL, "application/json");
      return kevEntries(await response.json(), since(cursors.kev))
        .toSorted((a, b) => b.dateAdded.localeCompare(a.dateAdded))
        .slice(0, MAX_ENTRIES_PER_SOURCE);
    }),
    // One source: both severities must be read for its cursor to move.
    attempt("GitHub advisories", async () => {
      const [critical, high] = await Promise.all([
        readAdvisories(fetch, "critical", advisoriesSince),
        readAdvisories(fetch, "high", advisoriesSince),
      ]);
      // Every page is read so the limit keeps the right ones.
      return [...newestFirst(critical), ...newestFirst(high)].slice(0, MAX_ENTRIES_PER_SOURCE);
    }),
    ...cursors.feeds.map((feed) =>
      attempt(feed.url, async () => {
        const response = await fetchOk(
          fetch,
          feed.url,
          "application/rss+xml, application/atom+xml, text/xml",
        );
        const items = newsItems(
          new URL(feed.url).host,
          parseFeed(await response.text()),
          since(feed.fetchedAt),
        );
        return { url: feed.url, items };
      }),
    ),
  ]);

  const entries: CollectedEntry[] = [
    ...(kev ?? []).map((entry): CollectedEntry => ({
      source: "KEV",
      externalId: entry.cve,
      advisoryIds: [entry.cve],
      publishedOn: entry.dateAdded,
      data: entry,
    })),
    ...(advisories ?? []).map((advisory): CollectedEntry => ({
      source: "GITHUB",
      externalId: advisory.ghsa,
      advisoryIds: advisory.cve ? [advisory.cve, advisory.ghsa] : [advisory.ghsa],
      publishedOn: advisory.publishedOn,
      data: advisory,
    })),
    ...news.flatMap((feed) =>
      (feed?.items ?? []).map((item): CollectedEntry => ({
        source: "NEWS",
        externalId: item.url,
        advisoryIds: item.cves,
        publishedOn: item.publishedOn,
        data: item,
      })),
    ),
  ];

  return {
    entries,
    read: {
      kev: kev !== null,
      advisories: advisories !== null,
      feeds: news.flatMap((feed) => (feed ? [feed.url] : [])),
    },
    failures: failures.toSorted((a, b) => a.source.localeCompare(b.source)),
  };
}
