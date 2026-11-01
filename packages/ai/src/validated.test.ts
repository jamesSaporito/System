import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { ChatMessage, StructuredApi } from "./anthropic";
import { noUsage } from "./usage";
import { AiValidationError, generateValidated } from "./validated";

const schema = z.object({ names: z.array(z.string()) });
const cost = { ...noUsage(), inputTokens: 100, outputTokens: 10 };

/** Replies with each output in turn, recording the messages it was sent. */
function fakeApi(outputs: unknown[]) {
  const calls: ChatMessage[][] = [];
  const api: StructuredApi = async ({ messages }) => {
    calls.push([...messages]);
    return { output: outputs[calls.length - 1], usage: cost };
  };
  return { api, calls };
}

describe("generateValidated", () => {
  it("returns the first reply that passes, with its usage", async () => {
    const { api, calls } = fakeApi([{ names: ["a"] }]);
    const result = await generateValidated({ api, system: "s", prompt: "p", schema });
    expect(result).toEqual({ value: { names: ["a"] }, usage: cost });
    expect(calls).toEqual([[{ role: "user", content: "p" }]]);
  });

  it("sends the problems back and adds up what every attempt cost", async () => {
    const { api, calls } = fakeApi([{ names: ["a", "a"] }, { names: ["a"] }]);
    const result = await generateValidated({
      api,
      system: "s",
      prompt: "p",
      schema,
      check: ({ names }) => (new Set(names).size < names.length ? ["✖ Repeated names"] : []),
      retryHint: "Name each once.",
    });
    expect(result.value).toEqual({ names: ["a"] });
    expect(result.usage.inputTokens).toBe(200);
    expect(calls[1]?.at(-1)?.content).toBe(
      "That failed validation:\n✖ Repeated names\n\nReturn the corrected reply. Name each once.",
    );
  });

  it("tidies the reply before checking it", async () => {
    const { api } = fakeApi(["a"]);
    const result = await generateValidated({
      api,
      system: "s",
      prompt: "p",
      schema,
      prepare: (output) => ({ names: [output] }),
    });
    expect(result.value).toEqual({ names: ["a"] });
  });

  it("gives up after the last attempt, keeping the usage", async () => {
    const { api } = fakeApi([null, undefined]);
    const failing = generateValidated({ api, system: "s", prompt: "p", schema });
    await expect(failing).rejects.toBeInstanceOf(AiValidationError);
    await expect(failing).rejects.toMatchObject({ usage: { inputTokens: 200 } });
  });
});
