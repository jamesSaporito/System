import { describe, expect, it } from "vitest";
import { briefMarkdown, normalizeUrl, research, unseenSources } from "./research";
import { MARKDOWN, sessionOf, turn } from "./fixtures";

describe("research", () => {
  it("resumes paused turns and combines what they found", async () => {
    const result = await research(
      sessionOf(
        turn({ stopReason: "pause_turn", text: "", searches: 1, seenUrls: ["https://a.test/x"] }),
        turn({ seenUrls: ["https://b.test/y#section"] }),
      ),
    );

    expect(result.markdown).toBe(MARKDOWN.trim());
    expect(result.seenUrls).toEqual(new Set(["https://a.test/x", "https://b.test/y"]));
    expect(result.usage.inputTokens).toBe(2000);
  });

  it("writes no brief when no search returned results", async () => {
    const searchless = turn({ searches: 0, toolErrors: ["unavailable"] });
    await expect(research(sessionOf(searchless))).rejects.toThrow(/unavailable/);
  });

  it("fails on a refusal, a cut-off reply, or a turn that never ends", async () => {
    await expect(research(sessionOf(turn({ stopReason: "refusal" })))).rejects.toThrow(/refusal/);
    await expect(research(sessionOf(turn({ stopReason: "max_tokens" })))).rejects.toThrow(
      /max_tokens/,
    );
    const paused = turn({ stopReason: "pause_turn" });
    await expect(research(sessionOf(...Array.from({ length: 25 }, () => paused)))).rejects.toThrow(
      /pause_turn/,
    );
  });

  it("returns no brief when the model found nothing new", async () => {
    const result = await research(sessionOf(turn({ text: " NOTHING NEW " })));
    expect(result.markdown).toBeNull();
  });

  it("fails when the reply isn't a brief", async () => {
    await expect(research(sessionOf(turn({ text: "I could not find anything." })))).rejects.toThrow(
      /heading/,
    );
  });
});

describe("briefMarkdown", () => {
  it("drops text before the heading and a code fence around the brief", () => {
    const wrapped = `Here is the brief:\n\n\`\`\`markdown\n${MARKDOWN}\`\`\``;
    expect(briefMarkdown(wrapped)).toBe(MARKDOWN.trim());
  });
});

const item = (...urls: string[]) => ({ sources: urls.map((url) => ({ url })) });

describe("unseenSources", () => {
  const seen = new Set(["https://a.test/x", "https://b.test"].map(normalizeUrl));

  it("accepts links that differ only by fragment, trailing slash or host case", () => {
    const items = [item("https://A.test/x/#top", "https://b.test/")];
    expect(unseenSources(items, seen)).toEqual([]);
  });

  it("lists links the research never saw, once each", () => {
    const items = [
      item("https://a.test/x", "https://made-up.test/p"),
      item("https://made-up.test/p"),
    ];
    expect(unseenSources(items, seen)).toEqual(["https://made-up.test/p"]);
  });
});
