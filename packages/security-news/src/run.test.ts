import { describe, expect, it } from "vitest";
import { fakes, MARKDOWN, SOURCES, TODAY, turn } from "./fixtures";
import { NOTHING_NEW } from "./prompt";
import { BriefRunError, runBrief, sourceDomains } from "./run";

describe("runBrief", () => {
  it("stores the researched brief and reports what it cost", async () => {
    const { model, backend, calls } = fakes({});
    const result = await runBrief({ model, backend, today: TODAY, sources: SOURCES });

    expect(result).toMatchObject({ outcome: "stored", runOn: TODAY, itemCount: 2 });
    expect(result.usage.inputTokens).toBe(1000);
    expect(calls.stored).toMatchObject([{ runOn: TODAY, markdown: MARKDOWN.trim() }]);
  });

  it("gives the research the previous brief so repeats are marked as updates", async () => {
    const previous = { runOn: "2026-10-30", markdown: "# Security News\n\nyesterday's brief" };
    const { model, backend, calls } = fakes({ previous });
    await runBrief({ model, backend, today: TODAY, sources: SOURCES });

    expect(calls.prompts[0]).toContain("yesterday's brief");
    expect(calls.prompts[0]).toContain("2026-10-24 to 2026-10-31");
  });

  it("stores nothing when web search returned nothing", async () => {
    const { model, backend, calls } = fakes({ turns: [turn({ searches: 0 })] });
    await expect(runBrief({ model, backend, today: TODAY, sources: SOURCES })).rejects.toThrow(
      /Web search/,
    );
    expect(calls.stored).toEqual([]);
  });

  it("stores nothing when the brief links a page the research never saw", async () => {
    const { model, backend, calls } = fakes({ turns: [turn({ seenUrls: [] })] });
    await expect(runBrief({ model, backend, today: TODAY, sources: SOURCES })).rejects.toThrow(
      /never saw/,
    );
    expect(calls.stored).toEqual([]);
  });

  it("reports what a failed run's research cost and wrote", async () => {
    const { model, backend } = fakes({ turns: [turn({ seenUrls: [] })] });
    const error: unknown = await runBrief({ model, backend, today: TODAY, sources: SOURCES }).catch(
      (e) => e,
    );

    expect(error).toBeInstanceOf(BriefRunError);
    expect(error).toMatchObject({ markdown: MARKDOWN.trim(), usage: { inputTokens: 1000 } });
  });

  it("stores nothing when the research finds nothing new", async () => {
    const { model, backend, calls } = fakes({ turns: [turn({ text: `${NOTHING_NEW}\n` })] });
    const result = await runBrief({ model, backend, today: TODAY, sources: SOURCES });

    expect(result).toMatchObject({ outcome: "nothing new", runOn: TODAY });
    expect(result.usage.inputTokens).toBe(1000);
    expect(calls.stored).toEqual([]);
  });

  it("stores nothing when the brief has no items", async () => {
    const { model, backend, calls } = fakes({
      outputs: [
        { coversFrom: "2026-10-24", coversTo: TODAY, mostUrgent: "Nothing critical", items: [] },
      ],
    });
    const result = await runBrief({ model, backend, today: TODAY, sources: SOURCES });

    expect(result.outcome).toBe("nothing new");
    expect(calls.stored).toEqual([]);
  });

  it("lists the sites in the request, and limits the web tools to them only when asked", async () => {
    const open = fakes({});
    await runBrief({ ...open, today: TODAY, sources: SOURCES });
    expect(open.calls.prompts[0]).toContain("- https://github.com/advisories");
    expect(open.calls.prompts[0]).toContain("Other sites may be used too");
    expect(open.calls.domains).toEqual([null]);

    const only = fakes({});
    await runBrief({ ...only, today: TODAY, sources: { ...SOURCES, searchBeyondSources: false } });
    expect(only.calls.prompts[0]).toContain("Only these sites can be searched or opened");
    expect(only.calls.domains).toEqual([["cisa.gov", "github.com"]]);
  });

  it("refuses to limit the web tools to an empty list of sites", async () => {
    const { model, backend, calls } = fakes({});
    const sources = { urls: [], searchBeyondSources: false };
    await expect(runBrief({ model, backend, today: TODAY, sources })).rejects.toThrow(
      /none are listed/,
    );
    expect(calls.prompts).toEqual([]);
  });
});

describe("sourceDomains", () => {
  it("reduces URLs to their domains, without www. and duplicates", () => {
    expect(
      sourceDomains([
        "https://www.securityweek.com/news/",
        "https://securityweek.com/category/vulnerabilities/",
        "https://NVD.nist.gov/vuln/search",
      ]),
    ).toEqual(["securityweek.com", "nvd.nist.gov"]);
  });
});
