import { describe, expect, it } from "vitest";
import { RESEARCH_SYSTEM_PROMPT, researchRequest } from "./prompt";

describe("prompts", () => {
  it("carries the skill's rules and the brief's layout", () => {
    expect(RESEARCH_SYSTEM_PROMPT).toContain("Every claim needs a source");
    expect(RESEARCH_SYSTEM_PROMPT).toContain("don't write a brief from memory");
    expect(RESEARCH_SYSTEM_PROMPT).toContain("## Worth Knowing");
    // The filesystem steps of the original skill don't apply here.
    expect(RESEARCH_SYSTEM_PROMPT).not.toContain("~/Documents");
    expect(RESEARCH_SYSTEM_PROMPT).toContain("**Impact:**");
    expect(RESEARCH_SYSTEM_PROMPT).toContain("reply with exactly `NOTHING NEW`");
  });

  it("states the window, and that there is no previous brief when there isn't one", () => {
    const request = researchRequest({
      today: "2026-10-31",
      previous: null,
      sources: { urls: [], searchBeyondSources: true },
    });
    expect(request).toContain("2026-10-24 to 2026-10-31");
    expect(request).toContain("There is no previous brief");
  });
});
