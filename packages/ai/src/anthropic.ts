import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { Usage } from "./usage";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * One structured request: `output` is the JSON the model returned, still unchecked (undefined
 * when it isn't JSON). This is the seam use cases depend on, so tests can pass a fake.
 */
export type StructuredApi = (input: {
  system: string;
  messages: ChatMessage[];
}) => Promise<{ output: unknown; usage: Usage }>;

export type StructuredOptions = {
  model: string;
  maxTokens: number;
  /** The shape the reply must have; sent to the API as a JSON schema. */
  schema: z.ZodType;
  effort?: "low" | "medium" | "high";
  /** Adaptive thinking, on by default. */
  thinking?: boolean;
};

/** The model stopped before finishing its reply; `usage` is what the request still cost. */
export class AiStoppedError extends Error {
  readonly usage: Usage;
  readonly stopReason: string;

  constructor(stopReason: string, usage: Usage) {
    super(`The model stopped early (stop reason: ${stopReason})`);
    this.name = "AiStoppedError";
    this.stopReason = stopReason;
    this.usage = usage;
  }
}

/** An Anthropic API client for the given key. */
export function createAnthropic(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

/**
 * The schema as a plain JSON-schema output format. zodOutputFormat also attaches a `parse`,
 * which makes the SDK validate and throw on its own; without it the output is left to the
 * caller's checks and retry (generateValidated). The SDK only parses when the format has `parse`
 * (@anthropic-ai/sdk 1.3.0, lib/parser.js, maybeParseMessage).
 */
const outputFormat = (schema: z.ZodType) => {
  const { type, schema: jsonSchema } = zodOutputFormat(schema);
  return { type, schema: jsonSchema };
};

/** Structured requests to the Anthropic API with fixed options, streamed since replies can be long. */
export function anthropicStructured(client: Anthropic, options: StructuredOptions): StructuredApi {
  const format = outputFormat(options.schema);
  return async ({ system, messages }) => {
    const response = await client.messages
      .stream({
        model: options.model,
        max_tokens: options.maxTokens,
        system,
        messages,
        ...(options.thinking === false ? {} : { thinking: { type: "adaptive" as const } }),
        output_config: { effort: options.effort ?? "medium", format },
      })
      .finalMessage();
    return structuredResult(response);
  };
}

export type StructuredResponse = {
  stop_reason: string | null;
  content: { type: string; text?: string }[];
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  };
};

/** Unparseable output becomes undefined, which fails validation and goes back to the model. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** The JSON a structured request returned, unchecked, with what it cost. */
export function structuredResult(response: StructuredResponse): { output: unknown; usage: Usage } {
  const usage: Usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
  };
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
    throw new AiStoppedError(response.stop_reason, usage);
  }
  const text = response.content.flatMap((block) =>
    block.type === "text" ? [block.text ?? ""] : [],
  );
  return { output: parseJson(text.join("")), usage };
}
