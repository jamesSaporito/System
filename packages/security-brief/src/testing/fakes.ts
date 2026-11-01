import { noUsage } from "@portfolio/ai";
import type { ModelApi } from "../brief/run";
import type { FetchLike } from "../feeds/feeds";

/** A date no real run will have, so tests can't touch real data. */
export const RUN_ON = "2999-01-01";

export type Behavior = {
  /** Holds the model's reply until it resolves, to test what happens while a run is going. */
  gate?: Promise<void>;
  /** Makes the model return nothing usable, so the run fails. */
  fail?: boolean;
  /** The requests the model was sent, in order (retries included). */
  requests: string[];
};

/** A model that writes a plain item for every group it's given, steered by `behavior`. */
export function fakeModel(behavior: Behavior): ModelApi {
  return {
    write: async ({ messages }) => {
      const request = messages[0]?.content ?? "";
      behavior.requests.push(request);
      await behavior.gate;
      if (behavior.fail) return { output: null, usage: noUsage() };
      const ids = [...request.matchAll(/<group id="(g\d+)">/g)].map((match) => match[1] ?? "");
      return {
        output: {
          items: ids.map((id) => ({
            id,
            subject: "Example",
            title: `Remote code execution (${id})`,
            exploitationStatus: null,
            exploitedInTheWild: false,
            affected: "All versions",
            fix: "Upgrade",
            impact: "Anyone running it.",
          })),
        },
        usage: { ...noUsage(), inputTokens: 1000, outputTokens: 100 },
      };
    },
  };
}

/** A CISA KEV catalog entry, as the catalog's JSON has it. */
export const kevRow = (cve: string, dateAdded = RUN_ON) => ({
  cveID: cve,
  vendorProject: "PHP Group",
  product: "PHP",
  vulnerabilityName: "PHP Remote Code Execution Vulnerability",
  dateAdded,
  shortDescription: "Remote code execution.",
  requiredAction: "Apply updates.",
  dueDate: "2999-01-22",
  knownRansomwareCampaignUse: "Unknown",
  notes: "",
});

/** A GitHub reviewed advisory, as the advisories API returns it. */
export const advisoryRow = (ghsa: string, cve: string | null, severity = "critical") => ({
  ghsa_id: ghsa,
  cve_id: cve,
  html_url: `https://github.com/advisories/${ghsa}`,
  summary: "Remote code execution",
  severity,
  published_at: `${RUN_ON}T10:00:00Z`,
  withdrawn_at: null,
  cvss_severities: {
    cvss_v3: { vector_string: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", score: 9.8 },
    cvss_v4: { vector_string: null, score: 0 },
  },
  vulnerabilities: [
    {
      package: { ecosystem: "npm", name: "example" },
      vulnerable_version_range: "< 2.0.0",
      first_patched_version: "2.0.0",
    },
  ],
});

/** What the fake sources serve; tests change it between runs. */
export type FakeFeeds = {
  kev: ReturnType<typeof kevRow>[];
  advisories: ReturnType<typeof advisoryRow>[];
  /** RSS feeds by URL; unlisted URLs answer 404. */
  rss: Record<string, string>;
  /** Sources that answer 503. */
  down: ("kev" | "github")[];
};

export const emptyFeeds = (): FakeFeeds => ({ kev: [], advisories: [], rss: {}, down: [] });

const unavailable = () => Promise.resolve(new Response("unavailable", { status: 503 }));

/** Serves `feeds`, recording each URL requested. */
export function fakeFeedFetch(feeds: FakeFeeds, requested: string[] = []): FetchLike {
  return (url) => {
    requested.push(url);
    if (url.includes("known_exploited_vulnerabilities")) {
      if (feeds.down.includes("kev")) return unavailable();
      return Promise.resolve(Response.json({ vulnerabilities: feeds.kev }));
    }
    if (url.startsWith("https://api.github.com/advisories")) {
      if (feeds.down.includes("github")) return unavailable();
      const severity = new URL(url).searchParams.get("severity");
      return Promise.resolve(
        Response.json(feeds.advisories.filter((advisory) => advisory.severity === severity)),
      );
    }
    const rss = feeds.rss[url];
    return Promise.resolve(
      rss === undefined ? new Response("not found", { status: 404 }) : new Response(rss),
    );
  };
}

/** An RSS feed with one security article per entry. */
export const rssFeed = (articles: { url: string; title: string; published: string }[]) =>
  `<?xml version="1.0"?><rss version="2.0"><channel><title>Example</title>${articles
    .map(
      (article) =>
        `<item><title>${article.title}</title><link>${article.url}</link><pubDate>${new Date(article.published).toUTCString()}</pubDate><description>A vulnerability story.</description></item>`,
    )
    .join("")}</channel></rss>`;
