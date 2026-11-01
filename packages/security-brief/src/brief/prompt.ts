import type { Advisory, KevEntry, NewsItem } from "../feeds/feeds";
import { type EntryGroup, groupEntriesAll, type StoredEntry } from "./group";

// The model's one job: write each group's text. What goes in, how entries are grouped, sections,
// severity, dates, links and what's new are decided in code (group.ts), so none of it is asked
// here. The prompt stays the same from run to run.

export const WRITING_SYSTEM_PROMPT = `You write the text of a daily security news brief. The user skims it in a minute to stay aware of security vulnerabilities, whatever technology they affect, and checks it against the linked sources.

The request gives groups of entries. Each group is one issue, made of entries from CISA's Known Exploited Vulnerabilities catalog (KEV), GitHub's reviewed security advisories and security news articles. Return exactly one item for every group, with that group's id. Never skip, merge or split groups, and never judge whether an issue matters: every group is listed.

## Facts

- Use only what the group's entries say. Never fill in versions, scores, dates or exploitation from your own knowledge; where no entry says, the field is null.
- If entries disagree (e.g. on the affected versions), say so in the text.

## Fields

- \`subject\`: the affected product or project, named as its vendor names it (PHP, Chrome, GitLab, an npm package's name), never a vulnerability's nickname; a nickname such as "PHP2Shell" goes in the title.
- \`title\`: one line on what the flaw lets an attacker do.
- \`exploitationStatus\`: one sentence on what the entries say about exploitation (every KEV entry is exploited in the wild, per CISA); null if they say nothing.
- \`exploitedInTheWild\`: true only when an entry says it's exploited in the wild (any KEV entry does).
- \`affected\`: the products and versions; null if no entry says.
- \`fix\`: the patched version or the required action (for KEV entries, CISA's required action, briefly); null if no entry says.
- \`impact\`: one or two sentences on who runs this and how exposed they are, from the entries.
- Every text field other than \`subject\` starts with a capital letter; if it would begin with a name styled in lowercase, such as npm, reword it ("The npm registry…").`;

const kevLine = (entry: KevEntry) =>
  `- CISA KEV ${entry.cve}: ${entry.vendor} ${entry.product}, ${entry.name}. Added ${entry.dateAdded}, federal due date ${entry.dueDate}.${entry.ransomware ? " Known ransomware use." : ""} ${entry.description} Required action: ${entry.requiredAction}`;

const advisoryLine = (advisory: Advisory) => {
  const ids = advisory.cve ? `${advisory.ghsa} (${advisory.cve})` : advisory.ghsa;
  const cvss =
    advisory.cvssScore === null
      ? ""
      : `, CVSS ${advisory.cvssScore}${advisory.cvssVersion ? ` (v${advisory.cvssVersion})` : ""}`;
  const packages = advisory.packages
    .map(
      (pkg) =>
        `${pkg.ecosystem} ${pkg.name} ${pkg.vulnerable}${pkg.patched ? `, fixed in ${pkg.patched}` : ", no fix yet"}`,
    )
    .join("; ");
  return `- GitHub advisory ${ids}, ${advisory.severity}${cvss}, published ${advisory.publishedOn}: ${advisory.summary}. Packages: ${packages || "not listed"}.`;
};

const newsLine = (item: NewsItem) =>
  `- News, ${item.site}, ${item.publishedOn}: ${item.title}.${item.summary ? ` ${item.summary}` : ""}`;

export function entryLine(entry: StoredEntry): string {
  if (entry.source === "KEV") return kevLine(entry.data);
  if (entry.source === "GITHUB") return advisoryLine(entry.data);
  return newsLine(entry.data);
}

/** The writing request: every group with its entries, an update's earlier entries included. */
export function writingRequest(groups: readonly EntryGroup[]): string {
  const lines = [`Write one item for each group below (${groups.length} in all).`, ""];
  for (const group of groups) {
    lines.push(`<group id="${group.id}">`, ...groupEntriesAll(group).map(entryLine), "</group>");
  }
  return lines.join("\n");
}
