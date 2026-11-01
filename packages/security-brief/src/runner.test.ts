import { beforeEach, describe, expect, it } from "vitest";
import type { StoredEntry } from "./brief/group";
import type { CollectedEntry, FeedCollection, FeedCursors } from "./feeds/feeds";
import { SecurityBriefRunner } from "./runner";
import type { BriefStore, RunRecord } from "./store/briefs";
import type { SourcesStore } from "./store/sources";
import {
  advisoryRow,
  type Behavior,
  emptyFeeds,
  type FakeFeeds,
  fakeFeedFetch,
  fakeModel,
  kevRow,
  RUN_ON,
} from "./testing/fakes";

// The runner's rules, with the stores in memory: no database, no HTTP.

const NOW = new Date(`${RUN_ON}T13:00:00Z`);

/** Entries and runs in memory; items are only counted. */
function memoryBriefs() {
  const entries: StoredEntry[] = [];
  const runs: RunRecord[] = [];
  let saved = 0;
  const store: BriefStore = {
    storeEntries: async (collected: CollectedEntry[]) => {
      const fresh = collected.filter(
        (entry) =>
          !entries.some((e) => e.source === entry.source && e.externalId === entry.externalId),
      );
      entries.push(
        ...fresh.map((entry) => ({ ...entry, id: `${entry.source}-${entry.externalId}` })),
      );
      return fresh.length;
    },
    unprocessed: async () => entries.slice(saved),
    itemsWithIds: async () => [],
    save: async () => {
      saved = entries.length;
    },
    days: async () => ({ days: [] }),
    day: async () => null,
    recordRun: async (run) => {
      runs.push(run);
    },
    lastRun: async () => null,
    ranOn: async (runOn) => runs.some((run) => run.runOn === runOn && run.outcome !== "FAILED"),
  };
  return { store, runs };
}

/** Cursors in memory, with no news feeds. */
function memorySources(cursors: Partial<FeedCursors> = {}) {
  const state: FeedCursors = { kev: null, advisories: null, feeds: [], ...cursors };
  const store: SourcesStore = {
    feeds: async () => ({ feeds: [] }),
    addFeed: async () => "exists",
    removeFeed: async () => false,
    cursors: async () => state,
    advanceCursors: async (read: FeedCollection["read"], at: Date) => {
      if (read.kev) state.kev = at;
      if (read.advisories) state.advisories = at;
    },
  };
  return { store, state };
}

/** A promise and the function that resolves it. */
function deferred() {
  const gate: { promise: Promise<void>; resolve: () => void } = {
    promise: Promise.resolve(),
    resolve: () => {},
  };
  gate.promise = new Promise<void>((resolve) => {
    gate.resolve = resolve;
  });
  return gate;
}

let behavior: Behavior;
let feeds: FakeFeeds;
let requested: string[];

beforeEach(() => {
  behavior = { requests: [] };
  feeds = { ...emptyFeeds(), kev: [kevRow("CVE-2999-10001")] };
  requested = [];
});

function runner(options: { model?: boolean; cursors?: Partial<FeedCursors> } = {}) {
  const briefs = memoryBriefs();
  const sources = memorySources(options.cursors);
  const instance = new SecurityBriefRunner({
    model: options.model === false ? null : fakeModel(behavior),
    now: () => NOW,
    fetch: fakeFeedFetch(feeds, requested),
    briefs: briefs.store,
    sources: sources.store,
    logger: { log: () => {}, error: () => {} },
  });
  return { instance, runs: briefs.runs, cursors: sources.state };
}

describe("SecurityBriefRunner", () => {
  it("writes the new entries, logs the run and moves the cursors", async () => {
    const { instance, runs, cursors } = runner();
    expect(instance.start()).toBe("started");
    expect(instance.runningSince()).toEqual(NOW);
    await instance.whenIdle();

    expect(behavior.requests).toHaveLength(1);
    expect(runs).toMatchObject([{ runOn: RUN_ON, outcome: "STORED", newEntries: 1, newItems: 1 }]);
    expect(cursors.kev).toEqual(NOW);
    expect(instance.runningSince()).toBeNull();
  });

  it("calls the model for nothing when nothing is waiting", async () => {
    feeds.kev = [];
    const { instance, runs } = runner();
    instance.start();
    await instance.whenIdle();

    expect(behavior.requests).toEqual([]);
    expect(runs).toMatchObject([{ outcome: "NOTHING_NEW", newEntries: 0 }]);
  });

  it("is unconfigured without a model, and refuses a second run while one is going", async () => {
    expect(runner({ model: false }).instance.start()).toBe("unconfigured");

    const gate = deferred();
    behavior.gate = gate.promise;
    const { instance } = runner();
    expect(instance.start()).toBe("started");
    expect(instance.start()).toBe("running");
    gate.resolve();
    await instance.whenIdle();
  });

  it("fails without the model when neither KEV nor GitHub can be read, keeping their cursors", async () => {
    feeds.down = ["kev", "github"];
    const { instance, runs, cursors } = runner();
    instance.start();
    await instance.whenIdle();

    expect(behavior.requests).toEqual([]);
    expect(runs).toMatchObject([{ outcome: "FAILED" }]);
    expect(runs[0]?.feedFailures.map((failure) => failure.source)).toEqual([
      "CISA KEV",
      "GitHub advisories",
    ]);
    expect(cursors).toMatchObject({ kev: null, advisories: null });
  });

  it("reads the last 24 hours with fullDay, whatever the cursors say", async () => {
    feeds.advisories = [advisoryRow("GHSA-2222-3333-4444", null)];
    const cursors = { kev: NOW, advisories: NOW };
    const since = () =>
      requested
        .filter((url) => url.includes("severity=critical"))
        .map((url) => new URL(url).searchParams.get("published"));

    const normal = runner({ cursors });
    normal.instance.start();
    await normal.instance.whenIdle();
    expect(since()).toEqual([`>=${RUN_ON}`]);

    requested = [];
    const full = runner({ cursors });
    full.instance.start({ fullDay: true });
    await full.instance.whenIdle();
    expect(since()).toEqual([">=2998-12-31"]);
  });

  it("runs on schedule once the day is due, and not again after it ran", async () => {
    const { instance } = runner();
    expect(await instance.runScheduled()).toBe("started");
    await instance.whenIdle();
    expect(await instance.runScheduled()).toBe("not due");
  });
});
