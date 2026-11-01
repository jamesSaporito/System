import { NOTHING_NEW } from "./prompt";
import { addUsage, noUsage, type Usage } from "./usage";

/** One response of the research conversation, reduced to what the job checks. */
export type ResearchTurn = {
  /** "end_turn" when done, "pause_turn" when the server wants the turn resumed. */
  stopReason: string | null;
  text: string;
  /** Searches and fetches that returned results, and the errors the others returned. */
  searches: number;
  fetches: number;
  toolErrors: string[];
  /** URLs of the results the model was given by searching and by opening pages. */
  seenUrls: string[];
  usage: Usage;
};

/** A conversation with the model; each call runs one turn and keeps the history itself. */
export type ResearchSession = { next: () => Promise<ResearchTurn> };

export type Research = {
  /** The brief, or null when the model found nothing new since the previous one. */
  markdown: string | null;
  seenUrls: Set<string>;
  toolErrors: string[];
  usage: Usage;
};

const MAX_TURNS = 20;

/**
 * Runs the research until the model has written the brief. Server-side tools can pause a long
 * turn ("pause_turn"); the session resumes it. Fails rather than writing a brief from memory:
 * without at least one search that returned results there is nothing to build it on.
 */
export async function research(session: ResearchSession): Promise<Research> {
  const turns: ResearchTurn[] = [];
  for (let count = 0; count < MAX_TURNS; count += 1) {
    const turn = await session.next();
    turns.push(turn);
    if (turn.stopReason !== "pause_turn") break;
  }

  const last = turns.at(-1);
  if (last?.stopReason !== "end_turn") {
    throw new Error(`Research ended without a brief (stop reason: ${last?.stopReason ?? "none"})`);
  }
  const searches = turns.reduce((total, turn) => total + turn.searches, 0);
  const toolErrors = turns.flatMap((turn) => turn.toolErrors);
  if (searches === 0) {
    throw new Error(
      `Web search returned nothing, so no brief was written (tool errors: ${toolErrors.join(", ") || "none"})`,
    );
  }

  return {
    markdown: last.text.trim() === NOTHING_NEW ? null : briefMarkdown(last.text),
    seenUrls: new Set(turns.flatMap((turn) => turn.seenUrls.map(normalizeUrl))),
    toolErrors,
    usage: turns.reduce((total, turn) => addUsage(total, turn.usage), noUsage()),
  };
}

/** The brief itself: from its heading on, without a code fence around it. */
export function briefMarkdown(text: string): string {
  const start = text.search(/^# Security News[ \t]*$/m);
  if (start === -1) throw new Error("The reply has no '# Security News' heading");
  return text
    .slice(start)
    .replace(/\n```[ \t]*$/, "")
    .trim();
}

/** Compares URLs ignoring fragments, a trailing slash, and the case of the host. */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${parsed.host}${path}${parsed.search}`;
  } catch {
    return url;
  }
}

/** Source links the model never saw in a search or fetch result, which it may have invented. */
export function unseenSources(
  items: readonly { sources: readonly { url: string }[] }[],
  seenUrls: ReadonlySet<string>,
): string[] {
  const unseen = items.flatMap((item) =>
    item.sources.map((source) => source.url).filter((url) => !seenUrls.has(normalizeUrl(url))),
  );
  return [...new Set(unseen)];
}
