import {
  type SecurityBriefInput,
  securityBriefInputSchema,
  securityBriefItemInputSchema,
} from "@portfolio/contracts";
import { z } from "zod";
import { EXTRACTION_SYSTEM_PROMPT, extractionRequest } from "./prompt";
import { addUsage, noUsage, type Usage } from "./usage";

/** What the model returns: the brief's data. The Markdown and run date come from the code. */
export const extractionSchema = z.object({
  coversFrom: z.iso.date(),
  coversTo: z.iso.date(),
  mostUrgent: z.string(),
  items: z.array(securityBriefItemInputSchema),
});

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Asks the model for structured output; `output` is whatever it parsed, still unchecked. */
export type ExtractApi = (input: {
  system: string;
  messages: ChatMessage[];
}) => Promise<{ output: unknown; usage: Usage }>;

const ATTEMPTS = 2;

/** Fields of readable text, which the contract requires to start with a capital letter. */
const SENTENCE_FIELDS = [
  "title",
  "exploitationStatus",
  "affected",
  "fix",
  "impact",
  "updateNote",
] as const;

const capitalize = (value: unknown): unknown =>
  typeof value === "string" ? value.replace(/^\s*\p{Ll}/u, (start) => start.toUpperCase()) : value;

/**
 * The brief is asked to start every sentence with a capital letter; this catches a stray
 * lowercase start in what the extraction returns, so it never costs a retry. Unknown shapes pass
 * through untouched for the contract to reject.
 */
function capitalizeSentences(output: Record<string, unknown>): Record<string, unknown> {
  const items = Array.isArray(output.items) ? output.items.map(capitalizeItem) : output.items;
  return { ...output, mostUrgent: capitalize(output.mostUrgent), items };
}

function capitalizeItem(item: unknown): unknown {
  const fields = asObject(item);
  if (Object.keys(fields).length === 0) return item;
  for (const field of SENTENCE_FIELDS) {
    if (field in fields) fields[field] = capitalize(fields[field]);
  }
  if (Array.isArray(fields.sources)) {
    fields.sources = fields.sources.map((source) => {
      const link = asObject(source);
      return "label" in link ? { ...link, label: capitalize(link.label) } : source;
    });
  }
  return fields;
}

/**
 * Turns the brief's Markdown into the stored shape. The stored Markdown is the research reply
 * verbatim, so what the model re-states here can't drift from what was written. Every result is
 * checked against the full contract (its cross-field rules can't be expressed to the model), and
 * a failure goes back to the model once with the problems listed.
 */
export async function extractBrief(input: {
  extract: ExtractApi;
  markdown: string;
  today: string;
}): Promise<{ brief: SecurityBriefInput; usage: Usage }> {
  const messages: ChatMessage[] = [{ role: "user", content: extractionRequest(input.markdown) }];
  let usage = noUsage();
  let problems = "";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const result = await input.extract({ system: EXTRACTION_SYSTEM_PROMPT, messages });
    usage = addUsage(usage, result.usage);

    const checked = securityBriefInputSchema.safeParse({
      ...capitalizeSentences(asObject(result.output)),
      runOn: input.today,
      markdown: input.markdown,
    });
    if (checked.success) return { brief: checked.data, usage };

    problems = z.prettifyError(checked.error);
    messages.push(
      { role: "assistant", content: JSON.stringify(result.output ?? null) },
      {
        role: "user",
        content: `That failed validation:\n${problems}\n\nReturn the corrected data.`,
      },
    );
  }
  throw new Error(`The brief's data failed validation after ${ATTEMPTS} attempts:\n${problems}`);
}

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
