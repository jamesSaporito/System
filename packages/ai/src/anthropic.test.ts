import { describe, expect, it } from "vitest";
import { AiStoppedError, structuredResult } from "./anthropic";

const usage = { input_tokens: 10, output_tokens: 5 };

describe("structuredResult", () => {
  it("joins the text blocks and parses them as JSON, with the usage", () => {
    const result = structuredResult({
      stop_reason: "end_turn",
      content: [
        { type: "thinking" },
        { type: "text", text: '{"a":' },
        { type: "text", text: "1}" },
      ],
      usage: { ...usage, cache_read_input_tokens: 3, cache_creation_input_tokens: null },
    });
    expect(result).toEqual({
      output: { a: 1 },
      usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 3, cacheCreationTokens: 0 },
    });
  });

  it("leaves output undefined when the text isn't JSON", () => {
    const result = structuredResult({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "not json" }],
      usage,
    });
    expect(result.output).toBeUndefined();
  });

  it.each(["refusal", "max_tokens"])("throws on %s, keeping what it cost", (reason) => {
    const stopped = () => structuredResult({ stop_reason: reason, content: [], usage });
    expect(stopped).toThrow(AiStoppedError);
    try {
      stopped();
    } catch (error) {
      expect(error).toMatchObject({ stopReason: reason, usage: { inputTokens: 10 } });
    }
  });
});
