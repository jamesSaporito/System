import {
  buildItem,
  type ExistingItem,
  groupEntries,
  type ItemWrite,
  type StoredEntry,
} from "./group";
import { WRITING_SYSTEM_PROMPT, writingRequest } from "./prompt";
import {
  addUsage,
  AiStoppedError,
  AiValidationError,
  noUsage,
  type StructuredApi,
  type Usage,
} from "@portfolio/ai";
import { writeGroups } from "./write";

/** Where entries and items are read and stored; the backend's database, in production. */
export type Backend = {
  /** Entries not yet written into an item, in a stable order. */
  unprocessed: () => Promise<StoredEntry[]>;
  /** Items sharing any of these CVE or GHSA ids, with all their entries. */
  itemsWithIds: (ids: string[]) => Promise<ExistingItem[]>;
  /** Creates or updates the items and links their entries, all or nothing. */
  save: (writes: ItemWrite[]) => Promise<void>;
};

/** The model side of the job; model.ts builds the real one from @portfolio/ai, tests use fakes. */
export type ModelApi = { write: StructuredApi };

export type RunResult =
  | { outcome: "stored"; newItems: number; updatedItems: number; usage: Usage }
  /** No entries were waiting; the model wasn't called. */
  | { outcome: "nothing new"; usage: Usage };

/**
 * Groups per request. Each item's reply is a few hundred tokens, so this keeps a reply well
 * inside the output limit on a busy day, and a failure costs one chunk, not the run.
 */
export const GROUPS_PER_REQUEST = 40;

/** A run that failed while writing; chunks written before the failure were stored. */
export class BriefRunError extends Error {
  readonly usage: Usage;
  readonly newItems: number;
  readonly updatedItems: number;

  constructor(message: string, result: { usage: Usage; newItems: number; updatedItems: number }) {
    super(message);
    this.name = "BriefRunError";
    this.usage = result.usage;
    this.newItems = result.newItems;
    this.updatedItems = result.updatedItems;
  }
}

/**
 * Writes the waiting entries into items: groups them in code, matches them to existing items,
 * has the model write only those groups' text, and stores each chunk as it's written. Entries of
 * a chunk that fails stay waiting for the next run.
 */
export async function runBrief(deps: {
  model: ModelApi;
  backend: Backend;
  /** Today as YYYY-MM-DD. */
  today: string;
}): Promise<RunResult> {
  const entries = await deps.backend.unprocessed();
  if (entries.length === 0) return { outcome: "nothing new", usage: noUsage() };

  const ids = [...new Set(entries.flatMap((entry) => entry.advisoryIds))];
  const existing = ids.length > 0 ? await deps.backend.itemsWithIds(ids) : [];
  const groups = groupEntries(entries, existing);

  const done = { usage: noUsage(), newItems: 0, updatedItems: 0 };
  for (let start = 0; start < groups.length; start += GROUPS_PER_REQUEST) {
    const chunk = groups.slice(start, start + GROUPS_PER_REQUEST);
    try {
      const written = await writeGroups({
        api: deps.model.write,
        system: WRITING_SYSTEM_PROMPT,
        request: writingRequest(chunk),
        ids: chunk.map((group) => group.id),
      });
      done.usage = addUsage(done.usage, written.usage);
      const writes = chunk.map((group) => {
        const writing = written.items.get(group.id);
        // writeGroups checked every id came back.
        if (!writing) throw new Error(`No item for group ${group.id}`);
        return buildItem(group, writing, deps.today);
      });
      await deps.backend.save(writes);
      for (const write of writes) {
        if (write.itemId === null) done.newItems += 1;
        else done.updatedItems += 1;
      }
    } catch (error) {
      // What the failed request still cost.
      if (error instanceof AiValidationError || error instanceof AiStoppedError) {
        done.usage = addUsage(done.usage, error.usage);
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new BriefRunError(reason, done);
    }
  }
  return { outcome: "stored", ...done };
}
