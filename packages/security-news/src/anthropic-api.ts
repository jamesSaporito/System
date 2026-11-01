import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { extractionSchema } from "./extract";
import type { ResearchTurn } from "./research";
import type { ModelApi } from "./run";
import { noUsage, type Usage } from "./usage";

const MODEL = "claude-opus-5-5";
// Re-runs a request the safety classifiers declined on the model Anthropic recommends for that
// category, inside the same call. https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
// Streaming, because the output limit is high and a research turn can run for minutes.
const RESEARCH_MAX_TOKENS = 64_000;
// Caps what one run can spend on searching and on pages read.
const MAX_SEARCHES = 30;
const MAX_FETCHES = 30;
const MAX_PAGE_TOKENS = 20_000;
// Plenty for a brief's data; a larger limit would need streaming.
const EXTRACT_MAX_TOKENS = 16_000;

type BetaMessage = Awaited<
  ReturnType<ReturnType<Anthropic["beta"]["messages"]["stream"]>["finalMessage"]>
>;

/** Unparseable output becomes undefined, which fails validation and goes back to the model. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** The SDK's response, reduced to what the job checks (see ResearchTurn). */
function summarize(message: BetaMessage): ResearchTurn {
  let text = "";
  let searches = 0;
  let fetches = 0;
  const toolErrors: string[] = [];
  const seenUrls: string[] = [];

  for (const block of message.content) {
    if (block.type === "text") {
      text += block.text;
    } else if (block.type === "web_search_tool_result") {
      // A failed search is a 200 whose content is an error object rather than a list of results.
      if (Array.isArray(block.content)) {
        searches += 1;
        seenUrls.push(...block.content.map((result: { url: string }) => result.url));
      } else {
        toolErrors.push(block.content.error_code);
      }
    } else if (block.type === "web_fetch_tool_result") {
      if (block.content.type === "web_fetch_result") {
        fetches += 1;
        seenUrls.push(block.content.url);
      } else {
        toolErrors.push(block.content.error_code);
      }
    }
  }

  return {
    stopReason: message.stop_reason,
    text,
    searches,
    fetches,
    toolErrors,
    seenUrls,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: message.usage.cache_creation_input_tokens ?? 0,
      webSearches: message.usage.server_tool_use?.web_search_requests ?? 0,
      webFetches: message.usage.server_tool_use?.web_fetch_requests ?? 0,
    },
  };
}

/**
 * One research request; a resumed turn sends the same system prompt and the grown messages.
 * `allowedDomains` limits both web tools to those domains (null: no limit).
 */
export function researchParams(
  system: string,
  messages: Anthropic.Beta.BetaMessageParam[],
  allowedDomains: string[] | null = null,
): Anthropic.Beta.MessageCreateParamsStreaming {
  const domains = allowedDomains ? { allowed_domains: allowedDomains } : {};
  return {
    betas: [FALLBACK_BETA],
    model: MODEL,
    max_tokens: RESEARCH_MAX_TOKENS,
    // Every search and fetch result is re-read on the request's later steps (1.3M input tokens on
    // the first live run). With caching on, the API caches after each server tool result, so those
    // re-reads bill as cache reads; a resumed pause_turn reuses the cache too.
    // Bundled claude-api skill docs: shared/prompt-caching.md, "Automatic vs explicit breakpoints".
    cache_control: { type: "ephemeral" },
    thinking: { type: "adaptive" },
    // The model's default is medium; research that must be right is worth more thinking.
    output_config: { effort: "high" },
    fallbacks: "default",
    system,
    // These two variants filter what they fetch with code on Anthropic's side, so code
    // execution must not also be declared.
    tools: [
      { type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES, ...domains },
      {
        type: "web_fetch_20260209",
        name: "web_fetch",
        max_uses: MAX_FETCHES,
        max_content_tokens: MAX_PAGE_TOKENS,
        ...domains,
      },
    ],
    messages,
    stream: true,
  };
}

/** The job's model side, talking to the Anthropic API with the given key. */
export function createAnthropicModelApi(apiKey: string): ModelApi {
  return anthropicModelApi(new Anthropic({ apiKey }));
}

export function anthropicModelApi(client: Anthropic): ModelApi {
  return {
    startResearch({ system, prompt, allowedDomains }) {
      const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];

      return {
        async next() {
          const stream = client.beta.messages.stream(
            researchParams(system, messages, allowedDomains),
          );
          const message = await stream.finalMessage();
          // A paused turn is resumed by sending it back unchanged.
          if (message.stop_reason === "pause_turn") {
            messages.push({ role: "assistant", content: message.content });
          }
          return summarize(message);
        },
      };
    },

    async extract({ system, messages }) {
      // `create`, not `parse`: parse() validates against the Zod schema itself and throws, which
      // would skip extractBrief's retry. The schema still constrains the output; extractBrief checks
      // it. (Per zodOutputFormat's doc comment in @anthropic-ai/sdk 1.3.0, helpers/zod.d.ts.)
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: EXTRACT_MAX_TOKENS,
        system,
        messages,
        output_config: { effort: "low", format: zodOutputFormat(extractionSchema) },
      });
      const usage: Usage = {
        ...noUsage(),
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
      };
      if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
        throw new Error(`Extraction stopped early (stop reason: ${response.stop_reason})`);
      }
      const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : []));
      return { output: parseJson(text.join("")), usage };
    },
  };
}
