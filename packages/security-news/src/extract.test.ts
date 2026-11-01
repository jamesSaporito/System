import { describe, expect, it } from "vitest";
import { type ExtractApi, extractBrief } from "./extract";
import { EXTRACTED, MARKDOWN, TODAY } from "./fixtures";
import { noUsage } from "./usage";

function extractFrom(outputs: unknown[]) {
  const requests: Parameters<ExtractApi>[0][] = [];
  const queue = [...outputs];
  const extract: ExtractApi = (input) => {
    requests.push({ ...input, messages: [...input.messages] });
    return Promise.resolve({ output: queue.shift(), usage: noUsage() });
  };
  return { extract, requests };
}

describe("extractBrief", () => {
  it("keeps the researched Markdown verbatim and sets the run date from the clock", async () => {
    const { extract } = extractFrom([EXTRACTED]);
    const { brief } = await extractBrief({ extract, markdown: MARKDOWN, today: TODAY });

    // The contract trims the Markdown, nothing else about it changes.
    expect(brief.markdown).toBe(MARKDOWN.trim());
    expect(brief.runOn).toBe(TODAY);
    expect(brief.items).toHaveLength(2);
  });

  it("capitalises text the model returned in lowercase, and leaves subjects alone", async () => {
    const { extract } = extractFrom([EXTRACTED]);
    const { brief } = await extractBrief({ extract, markdown: MARKDOWN, today: TODAY });

    const [php, chrome] = brief.items;
    expect(php?.fix).toBe("Upgrade to 8.2.35");
    expect(php?.title).toBe("Unauthenticated remote code execution");
    expect(chrome?.sources[0]?.label).toBe("Source");
    expect(chrome?.subject).toBe("Chrome");
  });

  it("sends validation problems back once, then accepts the corrected data", async () => {
    const wrong = { ...EXTRACTED, coversTo: "2026-11-15" }; // after the run date
    const { extract, requests } = extractFrom([wrong, EXTRACTED]);

    const { brief } = await extractBrief({ extract, markdown: MARKDOWN, today: TODAY });

    expect(brief.coversTo).toBe("2026-10-31");
    expect(requests).toHaveLength(2);
    expect(requests[1]?.messages.at(-1)?.content).toMatch(/failed validation[\s\S]*coversTo/);
  });

  it("gives up after two bad attempts", async () => {
    const { extract } = extractFrom([null, { items: "nope" }]);
    await expect(extractBrief({ extract, markdown: MARKDOWN, today: TODAY })).rejects.toThrow(
      /failed validation after 2 attempts/,
    );
  });
});
