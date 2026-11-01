import { describe, expect, it } from "vitest";
import { advisory, kev, news, TODAY, writing } from "./group-fixtures";
import { buildItem, type ExistingItem, groupEntries, storedEntry } from "./group";

const ids = (groups: ReturnType<typeof groupEntries>) =>
  groups.map((group) => group.added.map((entry) => entry.id));

const existing = (overrides: Partial<ExistingItem> = {}): ExistingItem => ({
  id: "item-1",
  advisoryIds: ["CVE-2026-1111"],
  firstSeenOn: "2026-10-30",
  updatedOn: null,
  updateNote: null,
  entries: [advisory("GHSA-cccc-cccc-cccc", "CVE-2026-1111")],
  ...overrides,
});

describe("groupEntries", () => {
  it("puts KEV entries and advisories sharing a CVE in one group, keyed g1, g2, …", () => {
    const groups = groupEntries(
      [
        kev("CVE-2026-1111"),
        advisory("GHSA-ffff-ffff-ffff", "CVE-2026-2222"),
        advisory("GHSA-cccc-cccc-cccc", "CVE-2026-1111"),
      ],
      [],
    );
    expect(groups.map((group) => group.id)).toEqual(["g1", "g2"]);
    expect(ids(groups)).toEqual([
      ["kev-CVE-2026-1111", "gh-GHSA-cccc-cccc-cccc"],
      ["gh-GHSA-ffff-ffff-ffff"],
    ]);
    expect(groups.every((group) => group.item === null)).toBe(true);
  });

  it("attaches an article to the first group it mentions, without merging groups", () => {
    const groups = groupEntries(
      [
        kev("CVE-2026-1111"),
        kev("CVE-2026-2222"),
        news("roundup", ["CVE-2026-1111", "CVE-2026-2222"]),
        news("no-cve", []),
      ],
      [],
    );
    expect(ids(groups)).toEqual([
      ["kev-CVE-2026-1111", "news-roundup"],
      ["kev-CVE-2026-2222"],
      ["news-no-cve"],
    ]);
  });

  it("makes a group sharing an id with an existing item an update of it", () => {
    const item = existing();
    const groups = groupEntries(
      [kev("CVE-2026-1111"), news("follow-up", ["CVE-2026-1111"]), news("other", ["CVE-2026-9"])],
      [item],
    );
    expect(groups.map((group) => group.item?.id ?? null)).toEqual(["item-1", null]);
    expect(ids(groups)).toEqual([["kev-CVE-2026-1111", "news-follow-up"], ["news-other"]]);
  });

  it("sends an article about an existing item to that item, even with no other new entries", () => {
    const groups = groupEntries(
      [news("a", ["CVE-2026-1111"]), news("b", ["CVE-2026-1111"])],
      [existing()],
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.item?.id).toBe("item-1");
    expect(ids(groups)).toEqual([["news-a", "news-b"]]);
  });
});

describe("buildItem", () => {
  it("fills everything but the text from the entries", () => {
    const [group] = groupEntries(
      [
        kev("CVE-2026-1111", { dateAdded: "2026-10-31" }),
        advisory("GHSA-cccc-cccc-cccc", "CVE-2026-1111", { severity: "high", cvssScore: 8.1 }),
        news("story", ["CVE-2026-1111", "CVE-2026-7777"]),
      ],
      [],
    );
    const write = buildItem(group!, writing("g1"), TODAY);

    expect(write).toMatchObject({ itemId: null, firstSeenOn: TODAY, updatedOn: null });
    expect(write.entryIds).toHaveLength(3);
    expect(write.item).toMatchObject({
      section: "ACTIVELY_EXPLOITED",
      // The article's other CVE isn't tied to this issue.
      advisoryIds: ["CVE-2026-1111", "GHSA-cccc-cccc-cccc"],
      severity: "HIGH",
      cvssScore: 8.1,
      cvssVersion: "3.1",
      exploitedInTheWild: true,
      kevAddedOn: "2026-10-31",
      publishedOn: "2026-10-30",
      updateNote: null,
      sources: [
        { label: "CISA KEV", url: "https://nvd.nist.gov/vuln/detail/CVE-2026-1111" },
        { label: "GitHub advisory", url: "https://github.com/advisories/GHSA-cccc-cccc-cccc" },
        { label: "news.example.com", url: "https://www.news.example.com/story/" },
      ],
    });
  });

  it.each([
    ["an advisory", [advisory("GHSA-cccc-cccc-cccc", null)], false, "CRITICAL_AND_HIGH"],
    ["an article", [news("story", [])], false, "WORTH_KNOWING"],
    ["an article reporting exploitation", [news("story", [])], true, "ACTIVELY_EXPLOITED"],
  ] as const)("sections %s", (_, entries, exploited, section) => {
    const [group] = groupEntries(entries, []);
    const write = buildItem(group!, writing("g1", { exploitedInTheWild: exploited }), TODAY);
    expect(write.item.section).toBe(section);
  });

  it("keeps a lone article's CVEs and leaves severity and CVSS empty", () => {
    const [group] = groupEntries([news("story", ["CVE-2026-7777"])], []);
    expect(buildItem(group!, writing("g1"), TODAY).item).toMatchObject({
      advisoryIds: ["CVE-2026-7777"],
      severity: null,
      cvssScore: null,
      cvssVersion: null,
    });
  });

  it("marks an update with today and what the new entries added", () => {
    const [group] = groupEntries(
      [kev("CVE-2026-1111"), news("follow-up", ["CVE-2026-1111"])],
      [existing()],
    );
    const write = buildItem(group!, writing("g1"), TODAY);
    expect(write).toMatchObject({ itemId: "item-1", firstSeenOn: "2026-10-30", updatedOn: TODAY });
    expect(write.item.updateNote).toBe("Added to CISA KEV; new article: news.example.com");
    expect(write.item.section).toBe("ACTIVELY_EXPLOITED");
    expect(write.entryIds).toEqual(["kev-CVE-2026-1111", "news-follow-up"]);
    // Written from all its entries: the earlier advisory still links.
    expect(write.item.sources.map((source) => source.label)).toEqual([
      "CISA KEV",
      "GitHub advisory",
      "news.example.com",
    ]);
  });

  it("adds to an update made earlier today", () => {
    const item = existing({ updatedOn: TODAY, updateNote: "Added to CISA KEV" });
    const [group] = groupEntries([news("follow-up", ["CVE-2026-1111"])], [item]);
    expect(buildItem(group!, writing("g1"), TODAY).item.updateNote).toBe(
      "Added to CISA KEV; new article: news.example.com",
    );
  });

  it("doesn't mark an item first seen today as updated", () => {
    const item = existing({ firstSeenOn: TODAY });
    const [group] = groupEntries([news("follow-up", ["CVE-2026-1111"])], [item]);
    const write = buildItem(group!, writing("g1"), TODAY);
    expect(write.updatedOn).toBeNull();
    expect(write.item.updateNote).toBeNull();
  });
});

describe("storedEntry", () => {
  it("reads a row back, checking its data", () => {
    const entry = kev("CVE-2026-1111");
    expect(storedEntry({ ...entry, data: JSON.parse(JSON.stringify(entry.data)) })).toEqual(entry);
    expect(() => storedEntry({ ...entry, data: { cve: 1 } })).toThrow();
  });
});
