import type { ExtractApi } from "./extract";
import type { ResearchSession, ResearchTurn } from "./research";
import type { ResearchSources } from "./prompt";
import type { Backend, ModelApi } from "./run";
import { noUsage } from "./usage";

export const TODAY = "2026-10-31";

export const MARKDOWN = `# Security News

| Date | Covers | Most urgent |
|---|---|---|
| 2026-10-31 | 2026-10-24 to 2026-10-31 | PHP CVE-2026-10001: remote code execution |

## Actively Exploited

### PHP: unauthenticated remote code execution (CVE-2026-10001)
- **Severity:** Critical, CVSS 9.8 (v3.1). Exploited in the wild; in CISA KEV since 2026-10-28.
- **Affected:** PHP 8.2 before 8.2.35
- **Fix:** upgrade to 8.2.35
- **Published:** 2026-10-27
- **Impact:** Every PHP site is exposed.
- **Sources:** [PHP advisory](https://example.com/php-advisory), [News](https://example.com/news/php/)

## Worth Knowing

- Chrome: stable update ([source](https://example.com/chrome))
`;

/** The sites listed in the admin, with other sites allowed too. */
export const SOURCES: ResearchSources = {
  urls: [
    "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    "https://github.com/advisories",
  ],
  searchBeyondSources: true,
};

/**
 * What the model's extraction returns for MARKDOWN. Two fields start lowercase, as a model might
 * return them; extraction capitalises them.
 */
export const EXTRACTED = {
  coversFrom: "2026-10-24",
  coversTo: "2026-10-31",
  mostUrgent: "PHP CVE-2026-10001: remote code execution",
  items: [
    {
      section: "ACTIVELY_EXPLOITED",
      subject: "PHP",
      title: "unauthenticated remote code execution",
      advisoryIds: ["CVE-2026-10001"],
      severity: "CRITICAL",
      cvssScore: 9.8,
      cvssVersion: "3.1",
      exploitationStatus: "Exploited in the wild",
      kevAddedOn: "2026-10-28",
      affected: "PHP 8.2 before 8.2.35",
      fix: "upgrade to 8.2.35",
      publishedOn: "2026-10-27",
      impact: "Every PHP site is exposed.",
      isUpdate: false,
      updateNote: null,
      sources: [
        { label: "PHP advisory", url: "https://example.com/php-advisory" },
        { label: "News", url: "https://example.com/news/php/" },
      ],
    },
    {
      section: "WORTH_KNOWING",
      subject: "Chrome",
      title: "stable update",
      advisoryIds: [],
      severity: null,
      cvssScore: null,
      cvssVersion: null,
      exploitationStatus: null,
      kevAddedOn: null,
      affected: null,
      fix: null,
      publishedOn: null,
      impact: null,
      isUpdate: false,
      updateNote: null,
      sources: [{ label: "source", url: "https://example.com/chrome" }],
    },
  ],
};

export const SEEN_URLS = [
  "https://example.com/php-advisory",
  "https://example.com/news/php",
  "https://example.com/chrome",
];

export function turn(overrides: Partial<ResearchTurn> = {}): ResearchTurn {
  return {
    stopReason: "end_turn",
    text: MARKDOWN,
    searches: 2,
    fetches: 3,
    toolErrors: [],
    seenUrls: SEEN_URLS,
    usage: { ...noUsage(), inputTokens: 1000, outputTokens: 500, webSearches: 2 },
    ...overrides,
  };
}

/** A session that plays the given turns in order. */
export function sessionOf(...turns: ResearchTurn[]): ResearchSession {
  let index = 0;
  return {
    next: () => {
      const next = turns[index];
      index += 1;
      return next ? Promise.resolve(next) : Promise.reject(new Error("no more turns"));
    },
  };
}

export type StoredCalls = {
  stored: unknown[];
  prompts: string[];
  /** The allowedDomains each research was started with. */
  domains: (string[] | null)[];
};

/** A model and backend that record what they receive. */
export function fakes(options: {
  turns?: ResearchTurn[];
  outputs?: unknown[];
  previous?: { runOn: string; markdown: string } | null;
}): { model: ModelApi; backend: Backend; calls: StoredCalls } {
  const calls: StoredCalls = { stored: [], prompts: [], domains: [] };
  const outputs = [...(options.outputs ?? [EXTRACTED])];
  const extract: ExtractApi = () =>
    Promise.resolve({ output: outputs.shift() ?? null, usage: noUsage() });
  return {
    calls,
    model: {
      startResearch: ({ prompt, allowedDomains }) => {
        calls.prompts.push(prompt);
        calls.domains.push(allowedDomains);
        return sessionOf(...(options.turns ?? [turn()]));
      },
      extract,
    },
    backend: {
      latest: () => Promise.resolve(options.previous ?? null),
      store: (brief) => {
        calls.stored.push(brief);
        return Promise.resolve();
      },
    },
  };
}
