import { type ModelApi, noUsage, type ResearchTurn } from "@portfolio/security-news";

/** A date no real brief will have, so tests can't touch real data. */
export const RUN_ON = "2999-01-01";

const SOURCE = { label: "Vendor", url: "https://example.com/advisory" };

const MARKDOWN = "# Security News\n\nThe researched brief.";

const WORTH_KNOWING = {
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
  sources: [SOURCE],
};

/** What the model's extraction returns: items out of reading order on purpose. */
const EXTRACTED = {
  coversFrom: "2998-12-25",
  coversTo: RUN_ON,
  mostUrgent: "PHP CVE-2026-10001: remote code execution",
  items: [
    {
      ...WORTH_KNOWING,
      section: "CRITICAL_AND_HIGH",
      subject: "GitLab",
      title: "account takeover",
      severity: "HIGH",
      cvssScore: 8.1,
      cvssVersion: "3.1",
      affected: "17.x",
      fix: "17.5.1",
      publishedOn: "2998-12-30",
      impact: "Widely self-hosted.",
    },
    WORTH_KNOWING,
    {
      ...WORTH_KNOWING,
      section: "ACTIVELY_EXPLOITED",
      subject: "PHP",
      title: "remote code execution",
      advisoryIds: ["CVE-2026-10001"],
      severity: "CRITICAL",
      cvssScore: 9.8,
      cvssVersion: "4.0",
      exploitationStatus: "exploited in the wild",
      kevAddedOn: "2998-12-28",
      affected: "8.2 before 8.2.35",
      fix: "8.2.35",
      publishedOn: "2998-12-27",
      impact: "Every PHP site is exposed.",
    },
  ],
};

export type Behavior = {
  /** Holds the research until it resolves, to test what happens while a run is going. */
  gate?: Promise<void>;
  /** Makes the extraction return nothing usable, so the run fails. */
  fail?: boolean;
  /** Makes the research find nothing new since the previous brief. */
  nothingNew?: boolean;
  /** Prompts the research received, in order. */
  prompts: string[];
  /** The domains each research was limited to (null: none). */
  domains: (string[] | null)[];
};

/** A model that writes one fixed brief, steered by `behavior` (read on every call). */
export function fakeModel(behavior: Behavior): ModelApi {
  const turn: ResearchTurn = {
    stopReason: "end_turn",
    text: MARKDOWN,
    searches: 1,
    fetches: 1,
    toolErrors: [],
    seenUrls: [SOURCE.url],
    usage: noUsage(),
  };
  return {
    startResearch: ({ prompt, allowedDomains }) => {
      behavior.prompts.push(prompt);
      behavior.domains.push(allowedDomains);
      return {
        next: async () => {
          await behavior.gate;
          return behavior.nothingNew ? { ...turn, text: "NOTHING NEW" } : turn;
        },
      };
    },
    extract: () => Promise.resolve({ output: behavior.fail ? null : EXTRACTED, usage: noUsage() }),
  };
}
