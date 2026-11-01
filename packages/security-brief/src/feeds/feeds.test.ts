import { describe, expect, it } from "vitest";
import {
  ATOM_FEED,
  ATOM_XML,
  CRITICAL_JSON,
  fakeFetch,
  HIGH_JSON,
  KEV_JSON,
  RSS_FEED,
  RSS_XML,
} from "./feed-fixtures";
import {
  ADVISORIES_URL,
  advisoryEntries,
  collectFeeds,
  type FeedCursors,
  type FetchLike,
  KEV_URL,
  kevEntries,
  MAX_ENTRIES_PER_SOURCE,
  newsItems,
  nextPage,
  parseFeed,
  readSince,
} from "./feeds";

const NOW = new Date("2026-10-31T12:00:00Z");
const SINCE = new Date("2026-10-24T00:00:00Z");
/** Cursors a week back, so every fixture entry is in range. */
const WEEK: FeedCursors = {
  kev: new Date("2026-10-24T01:00:00Z"),
  advisories: new Date("2026-10-24T01:00:00Z"),
  feeds: [
    { url: RSS_FEED, fetchedAt: new Date("2026-10-24T01:00:00Z") },
    { url: ATOM_FEED, fetchedAt: new Date("2026-10-24T01:00:00Z") },
  ],
};

describe("readSince", () => {
  it("starts an hour before the cursor, or 24 hours back on the first read", () => {
    expect(readSince(new Date("2026-10-31T06:00:00Z"), NOW)).toEqual(
      new Date("2026-10-31T05:00:00Z"),
    );
    expect(readSince(null, NOW)).toEqual(new Date("2026-10-30T12:00:00Z"));
  });

  it("reads at least the last 24 hours with fullDay, or from an older cursor", () => {
    expect(readSince(new Date("2026-10-31T06:00:00Z"), NOW, true)).toEqual(
      new Date("2026-10-30T12:00:00Z"),
    );
    expect(readSince(null, NOW, true)).toEqual(new Date("2026-10-30T12:00:00Z"));
    expect(readSince(new Date("2026-10-28T06:00:00Z"), NOW, true)).toEqual(
      new Date("2026-10-28T05:00:00Z"),
    );
  });
});

describe("kevEntries", () => {
  it("keeps entries added on or after the day, linking NVD and the entry's notes", () => {
    const entries = kevEntries(KEV_JSON, SINCE);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      cve: "CVE-2026-109618",
      product: "PHP",
      dateAdded: "2026-10-26",
      ransomware: false,
      urls: [
        "https://nvd.nist.gov/vuln/detail/CVE-2026-109618",
        "https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w",
        "https://nvd.nist.gov/vuln/detail/CVE-2026-109618",
      ],
    });
    expect(kevEntries(KEV_JSON, new Date("2026-10-27T00:00:00Z"))).toEqual([]);
  });
});

describe("advisoryEntries", () => {
  it("drops withdrawn advisories and reads the newest CVSS score that's set", () => {
    const advisories = advisoryEntries(CRITICAL_JSON, "critical", SINCE);
    expect(advisories).toHaveLength(1);
    expect(advisories[0]).toMatchObject({
      cvssScore: 9.8,
      cvssVersion: "3.1",
      publishedOn: "2026-10-30",
      packages: [
        {
          ecosystem: "npm",
          name: "signalk-server",
          vulnerable: ">= 2.0.0, < 2.34.0",
          patched: "2.34.0",
        },
      ],
    });

    const [nextJs] = advisoryEntries(HIGH_JSON, "high", SINCE);
    expect(nextJs).toMatchObject({ cve: "CVE-2026-20000", cvssScore: 8.7, cvssVersion: "4.0" });
  });

  it("drops advisories published before the time, not just the day", () => {
    expect(advisoryEntries(CRITICAL_JSON, "critical", new Date("2026-10-30T23:00:00Z"))).toEqual(
      [],
    );
  });
});

describe("nextPage", () => {
  it("reads the next page from a Link header", () => {
    expect(
      nextPage('<https://api.github.com/advisories?after=x>; rel="next", <https://a>; rel="prev"'),
    ).toBe("https://api.github.com/advisories?after=x");
    expect(nextPage('<https://a>; rel="prev"')).toBeNull();
    expect(nextPage(null)).toBeNull();
  });
});

describe("parseFeed", () => {
  it("reads RSS items: CDATA, entities, escaped HTML and dates", () => {
    const [first] = parseFeed(RSS_XML);
    expect(first).toEqual({
      title: "PHP2Shell flaws now exploited & added to KEV",
      url: "https://news.example.com/php2shell-exploited/",
      published: new Date("2026-10-27T14:00:00Z"),
      summary: "CISA says CVE-2026-109618 and cve-2026-109619 are under attack.",
    });
    expect(parseFeed(RSS_XML)).toHaveLength(3);
  });

  it("reads Atom entries, taking the alternate link", () => {
    expect(parseFeed(ATOM_XML)).toEqual([
      {
        title: "Chrome patches actively exploited zero-day",
        url: "https://atom.example.org/chrome-zero-day?a=1&b=2",
        published: new Date("2026-10-30T08:00:00Z"),
        summary: "Google fixed CVE-2026-30000 in Chrome 150.",
      },
    ]);
  });

  it("returns nothing for something that isn't a feed", () => {
    expect(parseFeed("<html><body>Blocked</body></html>")).toEqual([]);
  });
});

describe("newsItems", () => {
  it("keeps security items published since the time and pulls out their CVE ids", () => {
    const items = newsItems("news.example.com", parseFeed(RSS_XML), SINCE);
    expect(items).toEqual([
      expect.objectContaining({
        site: "news.example.com",
        publishedOn: "2026-10-27",
        cves: ["CVE-2026-109618", "CVE-2026-109619"],
      }),
    ]);
    expect(
      newsItems("news.example.com", parseFeed(RSS_XML), new Date("2026-10-27T15:00Z")),
    ).toEqual([]);
  });

  it("keeps only the newest MAX_ENTRIES_PER_SOURCE security items, newest first", () => {
    const entries = Array.from({ length: MAX_ENTRIES_PER_SOURCE + 2 }, (_, index) => ({
      title: `Exploited vulnerability ${index}`,
      url: `https://news.example.com/${index}/`,
      published: new Date(Date.UTC(2026, 9, 25, index)),
      summary: "",
    }));
    const items = newsItems("news.example.com", entries, SINCE);
    expect(items).toHaveLength(MAX_ENTRIES_PER_SOURCE);
    expect(items[0]?.url).toBe(`https://news.example.com/${MAX_ENTRIES_PER_SOURCE + 1}/`);
    expect(items.map((item) => item.url)).not.toContain("https://news.example.com/0/");
  });

  it("skips links that aren't web pages", () => {
    const entry = { ...parseFeed(RSS_XML)[0]!, url: "javascript:alert(1)" };
    expect(newsItems("news.example.com", [entry], SINCE)).toEqual([]);
  });
});

const many = (count: number) => Array.from({ length: count }, (_, index) => index);

/** A critical advisory's JSON with another id, severity and publication day (in October 2026). */
const advisoryJson = (id: number, severity: string, day: number) => ({
  ...CRITICAL_JSON[0]!,
  ghsa_id: `GHSA-${String(id).padStart(4, "2")}-2222-2222`,
  severity,
  published_at: `2026-10-${day}T10:00:00Z`,
});

describe("collectFeeds", () => {
  it("reads every source from its cursor, following GitHub's pages, as entries to store", async () => {
    const { fetch, requested } = fakeFetch();
    const collected = await collectFeeds({ fetch, now: NOW, cursors: WEEK });

    expect(collected.failures).toEqual([]);
    expect(collected.read).toEqual({ kev: true, advisories: true, feeds: [RSS_FEED, ATOM_FEED] });
    expect(collected.entries.map((entry) => [entry.source, entry.externalId])).toEqual([
      ["KEV", "CVE-2026-109618"],
      ["GITHUB", "GHSA-4xm8-rg9h-jhq2"],
      ["GITHUB", "GHSA-hhhh-hhhh-hhhh"],
      ["GITHUB", "GHSA-pppp-pppp-pppp"],
      ["NEWS", "https://news.example.com/php2shell-exploited/"],
      ["NEWS", "https://atom.example.org/chrome-zero-day?a=1&b=2"],
    ]);
    expect(collected.entries[2]).toMatchObject({
      advisoryIds: ["CVE-2026-20000", "GHSA-hhhh-hhhh-hhhh"],
      publishedOn: "2026-10-30",
    });
    expect(requested).toContain(KEV_URL);
    expect(requested.filter((url) => url.startsWith(ADVISORIES_URL))).toHaveLength(3);
    expect(requested.find((url) => url.startsWith(ADVISORIES_URL))).toContain(
      "published=%3E%3D2026-10-24",
    );
  });

  it("takes at most MAX_ENTRIES_PER_SOURCE from KEV and GitHub: newest, critical first", async () => {
    const kevRow = KEV_JSON.vulnerabilities[0]!;
    const kev = many(MAX_ENTRIES_PER_SOURCE + 2).map((index) => ({
      ...kevRow,
      cveID: `CVE-2026-${20000 + index}`,
      dateAdded: `2026-10-${String(25 + (index % 6)).padStart(2, "0")}`,
    }));
    const critical = many(3).map((index) => advisoryJson(index, "critical", 25 + index));
    const high = many(MAX_ENTRIES_PER_SOURCE).map((index) => advisoryJson(100 + index, "high", 30));
    const fetch: FetchLike = (url) => {
      if (url === KEV_URL) return Promise.resolve(Response.json({ vulnerabilities: kev }));
      const severity = new URL(url).searchParams.get("severity");
      return Promise.resolve(Response.json(severity === "critical" ? critical : high));
    };

    const { entries } = await collectFeeds({ fetch, now: NOW, cursors: { ...WEEK, feeds: [] } });
    const kevEntriesRead = entries.filter((entry) => entry.source === "KEV");
    expect(kevEntriesRead).toHaveLength(MAX_ENTRIES_PER_SOURCE);
    expect(kevEntriesRead[0]?.publishedOn).toBe("2026-10-30");
    const advisories = entries.flatMap((entry) => (entry.source === "GITHUB" ? [entry.data] : []));
    expect(advisories).toHaveLength(MAX_ENTRIES_PER_SOURCE);
    expect(advisories.slice(0, 3).map((entry) => [entry.severity, entry.publishedOn])).toEqual([
      ["critical", "2026-10-27"],
      ["critical", "2026-10-26"],
      ["critical", "2026-10-25"],
    ]);
  });

  it("reads 24 hours back for a source never read before", async () => {
    const { fetch, requested } = fakeFetch();
    const collected = await collectFeeds({
      fetch,
      now: NOW,
      cursors: { kev: null, advisories: null, feeds: [{ url: RSS_FEED, fetchedAt: null }] },
    });
    // The fixtures' KEV entry and article are older than a day; the advisories aren't.
    expect(collected.entries.map((entry) => entry.source)).toEqual(["GITHUB", "GITHUB"]);
    expect(requested.find((url) => url.startsWith(ADVISORIES_URL))).toContain(
      "published=%3E%3D2026-10-30",
    );
  });

  it("reports a failing source, leaves it out of `read`, and uses the rest", async () => {
    const { fetch } = fakeFetch([RSS_FEED, `${ADVISORIES_URL}?severity=high&page=2`]);
    const collected = await collectFeeds({ fetch, now: NOW, cursors: WEEK });
    expect(collected.failures.toSorted((a, b) => a.source.localeCompare(b.source))).toEqual([
      { source: "GitHub advisories", reason: "HTTP 503" },
      { source: RSS_FEED, reason: "HTTP 503" },
    ]);
    expect(collected.read).toEqual({ kev: true, advisories: false, feeds: [ATOM_FEED] });
    expect(collected.entries.map((entry) => entry.source)).toEqual(["KEV", "NEWS"]);
  });
});
