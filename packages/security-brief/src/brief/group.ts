import {
  advisoryIdSchema,
  type SecurityBriefItemInput,
  securityBriefItemInputSchema,
  type SecurityBriefItemWriting,
  type SecurityBriefSection,
  type SecuritySource,
} from "../api/brief";
import {
  advisorySchema,
  type CollectedEntry,
  kevEntrySchema,
  newsItemSchema,
} from "../feeds/feeds";

// Everything the brief decides is decided here, in code, from the stored entries: which entries
// are one issue, whether that issue is new or an update of an item already written, its section,
// severity, dates, links and update note. The model only writes each group's text.

/** A stored feed entry (security_feed_entries). */
export type StoredEntry = CollectedEntry & { id: string };

/** An item already written, with every entry it was written from. */
export type ExistingItem = {
  id: string;
  advisoryIds: string[];
  firstSeenOn: string;
  updatedOn: string | null;
  updateNote: string | null;
  entries: StoredEntry[];
};

/** Entries that are one issue: a new item, or new entries for an existing one. */
export type EntryGroup = {
  /** "g1", "g2", …: what the model's reply is keyed by. */
  id: string;
  /** The entries not yet in an item. */
  added: StoredEntry[];
  /** The item they update; null for a new item. */
  item: ExistingItem | null;
};

/** What to store for one group. */
export type ItemWrite = {
  /** The item to update; null creates one. */
  itemId: string | null;
  item: SecurityBriefItemInput;
  firstSeenOn: string;
  updatedOn: string | null;
  /** The entries to link to the item. */
  entryIds: string[];
};

/** A database row read back into an entry; `data` is checked, since it's stored as JSON. */
export function storedEntry(row: {
  id: string;
  source: CollectedEntry["source"];
  externalId: string;
  advisoryIds: string[];
  publishedOn: string;
  data: unknown;
}): StoredEntry {
  const base = {
    id: row.id,
    externalId: row.externalId,
    advisoryIds: row.advisoryIds,
    publishedOn: row.publishedOn,
  };
  if (row.source === "KEV") return { ...base, source: "KEV", data: kevEntrySchema.parse(row.data) };
  if (row.source === "GITHUB") {
    return { ...base, source: "GITHUB", data: advisorySchema.parse(row.data) };
  }
  return { ...base, source: "NEWS", data: newsItemSchema.parse(row.data) };
}

const intersects = (ids: Iterable<string>, other: ReadonlySet<string>) => {
  for (const id of ids) if (other.has(id)) return true;
  return false;
};

/** The item an issue with these ids updates: the earliest one sharing an id. */
function matchingItem(ids: ReadonlySet<string>, items: readonly ExistingItem[]) {
  return items.find((item) => intersects(item.advisoryIds, ids)) ?? null;
}

/**
 * Groups waiting entries into issues. KEV entries and GitHub advisories that share a CVE or GHSA
 * id are one issue. A news article joins the first issue whose ids it mentions, without adding
 * its other ids, so a roundup of ten CVEs can't merge ten issues; otherwise it is its own issue.
 * An issue sharing an id with an existing item is an update of that item (the earliest one, if
 * several match). The order follows `entries`, so the same entries always give the same groups.
 */
export function groupEntries(
  entries: readonly StoredEntry[],
  existing: readonly ExistingItem[],
): EntryGroup[] {
  const items = existing.toSorted(
    (a, b) => a.firstSeenOn.localeCompare(b.firstSeenOn) || a.id.localeCompare(b.id),
  );
  type Draft = { added: StoredEntry[]; ids: Set<string>; item: ExistingItem | null };
  let drafts: Draft[] = [];

  // Advisory entries: merge every draft this entry's ids touch into one.
  for (const entry of entries) {
    if (entry.source === "NEWS") continue;
    const touched = drafts.filter((draft) => intersects(entry.advisoryIds, draft.ids));
    const merged: Draft = {
      added: [...touched.flatMap((draft) => draft.added), entry],
      ids: new Set([...touched.flatMap((draft) => [...draft.ids]), ...entry.advisoryIds]),
      item: null,
    };
    const first = touched[0] ? drafts.indexOf(touched[0]) : drafts.length;
    drafts = drafts.filter((draft) => !touched.includes(draft));
    drafts.splice(Math.min(first, drafts.length), 0, merged);
  }
  // Merging can reorder entries within a draft; keep them in the given order.
  const order = new Map(entries.map((entry, index) => [entry.id, index]));
  for (const draft of drafts) {
    draft.added.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    draft.item = matchingItem(draft.ids, items);
  }

  // Drafts that update the same item are one update.
  const byItem = new Map<string, Draft>();
  drafts = drafts.filter((draft) => {
    if (!draft.item) return true;
    const kept = byItem.get(draft.item.id);
    if (!kept) {
      byItem.set(draft.item.id, draft);
      return true;
    }
    kept.added.push(...draft.added);
    for (const id of draft.ids) kept.ids.add(id);
    return false;
  });

  for (const entry of entries) {
    if (entry.source !== "NEWS") continue;
    const cves = new Set(entry.advisoryIds);
    const joined = drafts.find((draft) => intersects(draft.ids, cves));
    if (joined) {
      joined.added.push(entry);
      continue;
    }
    const item = cves.size > 0 ? matchingItem(cves, items) : null;
    const update = item ? byItem.get(item.id) : undefined;
    if (update) {
      update.added.push(entry);
      continue;
    }
    const draft: Draft = { added: [entry], ids: cves, item };
    if (item) byItem.set(item.id, draft);
    drafts.push(draft);
  }

  return drafts.map((draft, index) => ({
    id: `g${index + 1}`,
    added: draft.added,
    item: draft.item,
  }));
}

/** Every entry the group's item is written from: the item's earlier ones, then the new ones. */
export const groupEntriesAll = (group: EntryGroup): StoredEntry[] => [
  ...(group.item?.entries ?? []),
  ...group.added,
];

/**
 * In CISA KEV, or an entry says it's exploited: Actively Exploited. Else a GitHub advisory (only
 * critical and high ones are read): Critical and High. Else (news alone): Worth Knowing.
 */
export function sectionOf(
  entries: readonly StoredEntry[],
  exploited: boolean,
): SecurityBriefSection {
  if (exploited || entries.some((entry) => entry.source === "KEV")) return "ACTIVELY_EXPLOITED";
  if (entries.some((entry) => entry.source === "GITHUB")) return "CRITICAL_AND_HIGH";
  return "WORTH_KNOWING";
}

/** "www.bleepingcomputer.com" → "bleepingcomputer.com". */
const siteName = (host: string) => host.replace(/^www\./, "");

/** One link per entry, KEV first, then advisories, then news; repeated URLs once. */
export function sourcesOf(entries: readonly StoredEntry[]): SecuritySource[] {
  const rank = { KEV: 0, GITHUB: 1, NEWS: 2 };
  const links = entries
    .toSorted((a, b) => rank[a.source] - rank[b.source])
    .flatMap((entry): SecuritySource[] => {
      if (entry.source === "KEV") {
        const url = entry.data.urls[0];
        return url ? [{ label: "CISA KEV", url }] : [];
      }
      if (entry.source === "GITHUB") return [{ label: "GitHub advisory", url: entry.data.url }];
      return [{ label: siteName(entry.data.site), url: entry.data.url }];
    });
  const seen = new Set<string>();
  return links.filter((link) => !seen.has(link.url) && seen.add(link.url));
}

/** What new entries added to an item, as phrases: "added to CISA KEV", "new article: …". */
function updatePhrases(added: readonly StoredEntry[]): string[] {
  const phrases = added.map((entry) => {
    if (entry.source === "KEV") return "added to CISA KEV";
    if (entry.source === "GITHUB") return "new GitHub advisory";
    return `new article: ${siteName(entry.data.site)}`;
  });
  return [...new Set(phrases)];
}

const capitalize = (text: string) => text.replace(/^\p{Ll}/u, (start) => start.toUpperCase());

/**
 * The update note and day. An item first seen today isn't marked as updated; one already updated
 * today keeps that day's note and adds to it.
 */
function updateOf(group: EntryGroup, today: string): { note: string | null; on: string | null } {
  const { item } = group;
  if (!item) return { note: null, on: null };
  if (item.firstSeenOn === today) return { note: item.updateNote, on: item.updatedOn };
  const earlier =
    item.updatedOn === today && item.updateNote
      ? item.updateNote
          .split("; ")
          .map((phrase) => phrase.replace(/^\p{Lu}/u, (c) => c.toLowerCase()))
      : [];
  const phrases = [...new Set([...earlier, ...updatePhrases(group.added)])];
  return { note: capitalize(phrases.join("; ")), on: today };
}

const SEVERITY_RANK = { critical: 0, high: 1 };

const earliest = (dates: string[]) => dates.toSorted()[0] ?? null;

/** The stored item for a group: the model's text, everything else from the entries. */
export function buildItem(
  group: EntryGroup,
  writing: SecurityBriefItemWriting,
  today: string,
): ItemWrite {
  const entries = groupEntriesAll(group);
  const advisories = entries.flatMap((entry) => (entry.source === "GITHUB" ? [entry.data] : []));
  const kev = entries.flatMap((entry) => (entry.source === "KEV" ? [entry.data] : []));
  const hasAdvisoryEntries = advisories.length > 0 || kev.length > 0;

  // A news article's ids are kept only when it stands alone, so a roundup that joined an issue
  // doesn't tie the issue to every CVE it lists.
  const ids = entries
    .filter((entry) => entry.source !== "NEWS" || !hasAdvisoryEntries)
    .flatMap((entry) => entry.advisoryIds)
    .filter((id) => advisoryIdSchema.safeParse(id).success);

  const strongest = advisories.toSorted(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  )[0];
  const scored = advisories
    .filter((advisory) => advisory.cvssScore !== null)
    .toSorted((a, b) => (b.cvssScore ?? 0) - (a.cvssScore ?? 0))[0];
  const exploited = writing.exploitedInTheWild || kev.length > 0;
  const update = updateOf(group, today);

  const item = securityBriefItemInputSchema.parse({
    section: sectionOf(entries, exploited),
    subject: writing.subject,
    title: writing.title,
    advisoryIds: [...new Set(ids)],
    severity: strongest ? (strongest.severity === "critical" ? "CRITICAL" : "HIGH") : null,
    cvssScore: scored?.cvssScore ?? null,
    cvssVersion: scored ? scored.cvssVersion : null,
    exploitationStatus: writing.exploitationStatus,
    exploitedInTheWild: exploited,
    kevAddedOn: earliest(kev.map((entry) => entry.dateAdded)),
    affected: writing.affected,
    fix: writing.fix,
    publishedOn: earliest(entries.map((entry) => entry.publishedOn)),
    impact: writing.impact,
    updateNote: update.note,
    sources: sourcesOf(entries),
  });

  return {
    itemId: group.item?.id ?? null,
    item,
    firstSeenOn: group.item?.firstSeenOn ?? today,
    updatedOn: update.on,
    entryIds: group.added.map((entry) => entry.id),
  };
}
