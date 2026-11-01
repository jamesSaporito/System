import { describe, expect, it } from "vitest";
import { advisory, kev, news, TODAY, writing } from "./group-fixtures";
import type { ExistingItem, ItemWrite, StoredEntry } from "./group";
import { type Backend, BriefRunError, GROUPS_PER_REQUEST, runBrief } from "./run";
import { noUsage, type StructuredApi } from "@portfolio/ai";

/** A backend in memory: waiting entries, and the items saved from them. */
function memoryBackend(waiting: StoredEntry[], items: ExistingItem[] = []) {
  const saved: ItemWrite[][] = [];
  const backend: Backend = {
    unprocessed: () => Promise.resolve(waiting),
    itemsWithIds: (ids) =>
      Promise.resolve(items.filter((item) => item.advisoryIds.some((id) => ids.includes(id)))),
    save: (writes) => {
      saved.push(writes);
      return Promise.resolve();
    },
  };
  return { backend, saved };
}

/** A model that replies with `reply(ids)` for each request, recording the requests. */
function fakeModel(reply: (ids: string[], attempt: number) => unknown) {
  const requests: Parameters<StructuredApi>[0][] = [];
  const write: StructuredApi = (input) => {
    requests.push({ ...input, messages: [...input.messages] });
    const ids = [...(input.messages[0]?.content ?? "").matchAll(/<group id="(g\d+)">/g)].map(
      (match) => match[1] ?? "",
    );
    const attempt = (input.messages.length + 1) / 2;
    return Promise.resolve({
      output: reply(ids, attempt),
      usage: { ...noUsage(), inputTokens: 100, outputTokens: 10 },
    });
  };
  return { model: { write }, requests };
}

const writeAll = (ids: string[]) => ({ items: ids.map((id) => writing(id)) });

describe("runBrief", () => {
  it("does nothing, and calls no model, when no entries are waiting", async () => {
    const { backend, saved } = memoryBackend([]);
    const { model, requests } = fakeModel(writeAll);
    expect(await runBrief({ model, backend, today: TODAY })).toEqual({
      outcome: "nothing new",
      usage: noUsage(),
    });
    expect(requests).toEqual([]);
    expect(saved).toEqual([]);
  });

  it("sends only the waiting groups and stores one item each", async () => {
    const { backend, saved } = memoryBackend([
      kev("CVE-2026-1111"),
      advisory("GHSA-cccc-cccc-cccc", "CVE-2026-1111"),
      news("story", []),
    ]);
    const { model, requests } = fakeModel(writeAll);

    const result = await runBrief({ model, backend, today: TODAY });

    expect(result).toMatchObject({ outcome: "stored", newItems: 2, updatedItems: 0 });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.messages[0]?.content).toContain("(2 in all)");
    expect(saved.flat().map((write) => write.item.section)).toEqual([
      "ACTIVELY_EXPLOITED",
      "WORTH_KNOWING",
    ]);
  });

  it("counts updates of existing items", async () => {
    const item: ExistingItem = {
      id: "item-1",
      advisoryIds: ["CVE-2026-1111"],
      firstSeenOn: "2026-10-29",
      updatedOn: null,
      updateNote: null,
      entries: [advisory("GHSA-cccc-cccc-cccc", "CVE-2026-1111")],
    };
    const { backend, saved } = memoryBackend([kev("CVE-2026-1111")], [item]);
    const { model, requests } = fakeModel(writeAll);

    expect(await runBrief({ model, backend, today: TODAY })).toMatchObject({
      newItems: 0,
      updatedItems: 1,
    });
    // The model rewrites the item from all its entries.
    expect(requests[0]?.messages[0]?.content).toMatch(/GHSA-cccc-cccc-cccc[\s\S]*CISA KEV/);
    expect(saved[0]?.[0]).toMatchObject({ itemId: "item-1", updatedOn: TODAY });
  });

  it("sends a missing group back once, and stores the corrected reply", async () => {
    const { backend, saved } = memoryBackend([news("a", []), news("b", [])]);
    const { model, requests } = fakeModel((ids, attempt) =>
      attempt === 1 ? { items: [writing("g1", { title: "lowercase title" })] } : writeAll(ids),
    );

    const result = await runBrief({ model, backend, today: TODAY });

    expect(result).toMatchObject({ outcome: "stored", newItems: 2 });
    expect(result.usage.inputTokens).toBe(200);
    expect(requests).toHaveLength(2);
    expect(requests[1]?.messages.at(-1)?.content).toMatch(/Missing groups: g2/);
    expect(saved.flat()).toHaveLength(2);
  });

  it("capitalises a lowercase start rather than spending a retry on it", async () => {
    const { backend, saved } = memoryBackend([news("a", [])]);
    const { model, requests } = fakeModel(() => ({
      items: [writing("g1", { title: "npm token theft", subject: "npm" })],
    }));
    await runBrief({ model, backend, today: TODAY });
    expect(requests).toHaveLength(1);
    expect(saved[0]?.[0]?.item).toMatchObject({ title: "Npm token theft", subject: "npm" });
  });

  it("fails after two bad replies, storing nothing and saying what it cost", async () => {
    const { backend, saved } = memoryBackend([news("a", []), news("b", [])]);
    const { model } = fakeModel(() => ({ items: [writing("g1"), writing("g9")] }));

    const failure = await runBrief({ model, backend, today: TODAY }).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(BriefRunError);
    expect(failure).toMatchObject({ newItems: 0, usage: { inputTokens: 200 } });
    expect(String(failure)).toMatch(/Missing groups: g2[\s\S]*Unknown groups: g9/);
    expect(saved).toEqual([]);
  });

  it("writes a busy day in chunks, keeping the chunks done before a failure", async () => {
    const waiting = Array.from({ length: GROUPS_PER_REQUEST + 1 }, (_, index) =>
      news(`story-${index}`, []),
    );
    const { backend, saved } = memoryBackend(waiting);
    let calls = 0;
    const { model, requests } = fakeModel((ids) => {
      calls += 1;
      return calls === 1 ? writeAll(ids) : null;
    });

    const failure = await runBrief({ model, backend, today: TODAY }).catch(
      (error: unknown) => error,
    );

    expect(requests[0]?.messages[0]?.content).toContain(`(${GROUPS_PER_REQUEST} in all)`);
    expect(requests[1]?.messages[0]?.content).toContain("(1 in all)");
    expect(saved.map((writes) => writes.length)).toEqual([GROUPS_PER_REQUEST]);
    expect(failure).toMatchObject({ newItems: GROUPS_PER_REQUEST });
  });
});
