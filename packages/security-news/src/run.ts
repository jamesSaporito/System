import type { SecurityBriefInput } from "@portfolio/contracts";
import { type ExtractApi, extractBrief } from "./extract";
import { RESEARCH_SYSTEM_PROMPT, type ResearchSources, researchRequest } from "./prompt";
import { research, type ResearchSession, unseenSources } from "./research";
import { addUsage, type Usage } from "./usage";

/** The newest stored brief, which the research reads so repeats are marked as updates. */
export type PreviousBrief = { runOn: string; markdown: string };

/** Where briefs are read and stored; the backend's database, in production. */
export type Backend = {
  latest: () => Promise<PreviousBrief | null>;
  /** Stores a brief by its run date, replacing that day's if it exists. */
  store: (brief: SecurityBriefInput) => Promise<void>;
};

/** The model side of the job; anthropic-api.ts is the real one, tests use fakes. */
export type ModelApi = {
  startResearch: (input: {
    system: string;
    prompt: string;
    /** The only domains web search and fetch may reach; null for no restriction. */
    allowedDomains: string[] | null;
  }) => ResearchSession;
  extract: ExtractApi;
};

/** A stored brief, or a day with nothing new since the previous one (nothing stored). */
export type RunResult =
  | { outcome: "stored"; runOn: string; mostUrgent: string; itemCount: number; usage: Usage }
  | { outcome: "nothing new"; runOn: string; usage: Usage };

/** The web tools take at most this many domains in an allow-list. */
export const MAX_ALLOWED_DOMAINS = 64;

/**
 * The domains the listed sites are on. A domain covers its subdomains and "www." is an ordinary
 * subdomain, so it's dropped to cover both. Bundled claude-api skill docs:
 * shared/managed-agents-tools.md, "Domain list rules" (same rules as the Messages API tools).
 */
export function sourceDomains(urls: readonly string[]): string[] {
  const hosts = urls.map((url) => new URL(url).hostname.toLowerCase().replace(/^www\./, ""));
  return [...new Set(hosts)];
}

/** A run that failed after the research: says what the research cost and what it wrote. */
export class BriefRunError extends Error {
  /** The research's usage; a failed extraction's few tokens aren't counted. */
  readonly usage: Usage;
  /** The researched brief, which wasn't stored. */
  readonly markdown: string;

  constructor(message: string, usage: Usage, markdown: string) {
    super(message);
    this.name = "BriefRunError";
    this.usage = usage;
    this.markdown = markdown;
  }
}

/**
 * One daily run: read the previous brief, research and write today's, turn it into data, check
 * its links, store it. Nothing is stored unless every step succeeded, or when nothing is new.
 */
export async function runBrief(deps: {
  model: ModelApi;
  backend: Backend;
  /** Today as YYYY-MM-DD. */
  today: string;
  sources: ResearchSources;
}): Promise<RunResult> {
  const { sources } = deps;
  const allowedDomains = sources.searchBeyondSources ? null : sourceDomains(sources.urls);
  if (allowedDomains?.length === 0) {
    throw new Error("Only listed sites may be used, but none are listed");
  }
  if (allowedDomains && allowedDomains.length > MAX_ALLOWED_DOMAINS) {
    throw new Error(`Only listed sites may be used, but there are over ${MAX_ALLOWED_DOMAINS}`);
  }

  const previous = await deps.backend.latest();
  const session = deps.model.startResearch({
    system: RESEARCH_SYSTEM_PROMPT,
    prompt: researchRequest({ today: deps.today, previous, sources }),
    allowedDomains,
  });
  const researched = await research(session);
  const { markdown } = researched;
  if (markdown === null) {
    return { outcome: "nothing new", runOn: deps.today, usage: researched.usage };
  }

  let extracted: Awaited<ReturnType<typeof extractBrief>>;
  try {
    extracted = await extractBrief({
      extract: deps.model.extract,
      markdown,
      today: deps.today,
    });
    // "Only pages you actually opened": a link that never appeared in a result is likely invented.
    const unseen = unseenSources(extracted.brief.items, researched.seenUrls);
    if (unseen.length > 0) {
      throw new Error(`The brief links pages the research never saw:\n${unseen.join("\n")}`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BriefRunError(reason, researched.usage, markdown);
  }

  const usage = addUsage(researched.usage, extracted.usage);
  if (extracted.brief.items.length === 0) {
    return { outcome: "nothing new", runOn: deps.today, usage };
  }
  await deps.backend.store(extracted.brief);
  return {
    outcome: "stored",
    runOn: extracted.brief.runOn,
    mostUrgent: extracted.brief.mostUrgent,
    itemCount: extracted.brief.items.length,
    usage,
  };
}
