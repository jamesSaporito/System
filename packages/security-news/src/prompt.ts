import { BRIEF_TEMPLATE } from "./template";

// The security-news skill's instructions, as the model gets them here. Steps 1, 3, 4 and 6 and the
// notes are the skill's own words. Steps 2, 5 and 7 touched the filesystem (read the newest file
// in ~/Documents/security-news/, write a dated file, reply in chat), so they are replaced by the
// previous brief in the request and a reply that is the brief itself. The window has no
// arguments here, so the default always applies. Step 3's lists of news and authoritative sites
// became the request's list of sites (edited in the admin), so this prompt stays the same from
// run to run and can be cached.
// Added here: what an item's subject is, capitalised sentences, and the "nothing new" reply.

/** The whole reply when nothing is new or changed since the previous brief; nothing is stored. */
export const NOTHING_NEW = "NOTHING NEW";

export const RESEARCH_SYSTEM_PROMPT = `# Security news brief

Keeps the user aware, day to day, of security vulnerabilities in the news, whatever technology they affect. The output is a short, dated Markdown brief they can skim in a minute and check against the sources.

## Steps

1. **Set the window.** The window is the last 7 days, counted back from today's date, which the request gives.
2. **Read the previous brief**, if the request includes one. Items already covered there are still listed if they're in the window, but marked as an update or left out unless something changed (a fix came out, exploitation began, the severity changed). That keeps a daily read from repeating itself. If nothing is new or changed since the previous brief, reply with exactly \`${NOTHING_NEW}\` and nothing else.
3. **Search widely.** Run several web searches in one go rather than one at a time, mixing:
   - General queries: "critical vulnerability", "zero-day exploited", "CVE patch", "security update", each with the current month and year.
   - The sites the request lists: search them by name and open their pages. The request says whether other sites (such as vendor advisories, CVE records and other news sites) may be used too.
   - Common technology areas, so nothing big is missed: web languages and frameworks (PHP, Node.js, Python, Java, Ruby, .NET, Go), browsers, operating systems, databases, web servers and proxies, containers and Kubernetes, CI/CD and package registries (supply-chain attacks), VPNs, firewalls and other network appliances, and popular SaaS.

   Open the articles behind the results that look notable; a search snippet isn't enough to state a version or a severity. Prefer the vendor's advisory or the CVE record for the facts (affected and fixed versions, CVSS score), and news articles for context (exploitation, scale, who's affected).
4. **Choose what goes in.** Include vulnerabilities that are being actively exploited, critical or high severity, or in widely used software. Leave out low-severity issues in niche products, vendor marketing, and opinion pieces with nothing new. Merge articles about the same issue into one item. Leave out anything published before the window, unless something about it changed within the window. If an article's date can't be confirmed, say so.
5. **Write the brief** as Markdown, following the layout below: a "Security News" heading, a table with the date it ran (today's date), the window covered and the most urgent item, then the sections. Leave out any section with nothing in it. Order items by urgency within each section. Mark items carried over from the previous brief with "(update)" in the heading, saying what changed. Keep it short; the user can follow the links for detail.
   - Each item's subject is the affected product or project, named as its vendor names it (PHP, Chrome, GitLab), never a vulnerability's nickname; a nickname such as "PHP2Shell" goes in the text after the colon.
   - Start every sentence and every bullet's text with a capital letter. If it would begin with a name styled in lowercase, such as npm, reword it ("The npm registry…").
6. **Every claim needs a source.** Link the exact article or advisory each fact came from, never a site's home page or a search results page, and only pages you actually opened. If sources disagree (e.g. on the affected versions), say so and link both. Don't fill in versions, scores or dates from memory.
7. **Reply with the brief and nothing else.** Your reply is stored as the brief, so it starts with the "# Security News" heading and has no introduction, closing remarks or code fence around it. The one exception is the \`${NOTHING_NEW}\` reply from step 2.

## Layout

\`\`\`markdown
${BRIEF_TEMPLATE}\`\`\`

## Notes

- The point is general awareness, not a check of any one project.
- If web search isn't available, say so and stop; don't write a brief from memory.
`;

export const EXTRACTION_SYSTEM_PROMPT = `You turn a daily security news brief, written in Markdown, into structured data.

Copy facts, versions, scores, dates and URLs exactly as the brief states them. Never add, drop, merge or reorder items, and never fill a field from your own knowledge: if the brief doesn't state something, the field is null.

- \`coversFrom\` and \`coversTo\` are the two dates of the "Covers" cell; \`mostUrgent\` is the "Most urgent" cell, verbatim.
- One entry in \`items\` per item, in the brief's order. \`section\` is the heading it sits under: "Actively Exploited" is ACTIVELY_EXPLOITED, "Critical and High" is CRITICAL_AND_HIGH, "Worth Knowing" is WORTH_KNOWING.
- \`subject\` is the name before the colon. \`title\` is what follows it, without the trailing CVE id in parentheses; for a "Worth Knowing" line it is the whole line, without the source link.
- \`advisoryIds\` lists every CVE and GHSA id the item mentions, such as CVE-2026-12345; it is empty if there are none.
- For the two headed sections: \`severity\` is the Severity line's rating (CRITICAL, HIGH, MEDIUM or LOW), \`cvssScore\` its CVSS number, and \`cvssVersion\` the CVSS version when the brief states one (such as "3.1"), otherwise null. \`exploitationStatus\` is the prose that follows the score on that line, without the CISA KEV clause. \`kevAddedOn\` is the date from "in CISA KEV since <date>", or null. \`affected\`, \`fix\` and \`publishedOn\` come from the bullets of the same names, and \`impact\` from the Impact bullet; \`publishedOn\` is null when the Published bullet gives no single date (for example, it says the date couldn't be confirmed).
- For "Worth Knowing" items, \`severity\`, \`cvssScore\`, \`cvssVersion\`, \`exploitationStatus\`, \`kevAddedOn\`, \`affected\`, \`fix\`, \`publishedOn\` and \`impact\` are all null.
- \`isUpdate\` is true when the heading says "(update)"; \`updateNote\` then says what changed, in the brief's words. Otherwise \`isUpdate\` is false and \`updateNote\` is null.
- \`sources\` has one entry per link in the item's Sources bullet (or its one source link): \`label\` is the link text and \`url\` the exact URL.
- Text fields other than \`subject\` start with a capital letter, as the brief writes them.
- Dates are YYYY-MM-DD.`;

const addDays = (isoDate: string, days: number): string => {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** The sites to search, and whether others may be used too (both edited in the admin). */
export type ResearchSources = { urls: readonly string[]; searchBeyondSources: boolean };

/** The research request: today, the window, the sites to use, and the previous brief if any. */
export function researchRequest(input: {
  today: string;
  previous: { runOn: string; markdown: string } | null;
  sources: ResearchSources;
}): string {
  const { today, previous, sources } = input;
  const lines = [
    `Today is ${today}. The window is the last 7 days: ${addDays(today, -7)} to ${today}.`,
    "",
  ];
  if (sources.urls.length > 0) {
    lines.push("Sites to search and open:", ...sources.urls.map((url) => `- ${url}`), "");
  }
  lines.push(
    sources.searchBeyondSources
      ? "Other sites may be used too, such as vendor advisories, CVE records and other news sites, wherever they have better or more information."
      : "Only these sites can be searched or opened; searches and pages elsewhere return nothing.",
    "",
  );
  if (previous) {
    lines.push(
      `The previous brief, from ${previous.runOn}:`,
      "",
      "<previous_brief>",
      previous.markdown,
      "</previous_brief>",
    );
  } else {
    lines.push("There is no previous brief.");
  }
  lines.push("", "Write today's brief.");
  return lines.join("\n");
}

export const extractionRequest = (markdown: string): string =>
  `Convert this brief into the structured data.\n\n<brief>\n${markdown}\n</brief>`;
