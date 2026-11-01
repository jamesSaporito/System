import { anthropicStructured, createAnthropic } from "@portfolio/ai";
import { securityBriefWritingSchema } from "../api/brief";
import type { ModelApi } from "./run";

/** The model the brief is written with. */
export const BRIEF_MODEL = "claude-opus-5-5";
/** Thinking plus up to GROUPS_PER_REQUEST items. */
const WRITE_MAX_TOKENS = 48_000;

/** The brief's model side, talking to the Anthropic API with the given key. */
export function createBriefModel(apiKey: string): ModelApi {
  return {
    write: anthropicStructured(createAnthropic(apiKey), {
      model: BRIEF_MODEL,
      maxTokens: WRITE_MAX_TOKENS,
      schema: securityBriefWritingSchema,
      effort: "medium",
    }),
  };
}
