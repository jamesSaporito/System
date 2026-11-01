import { generateValidated, type StructuredApi, type Usage } from "@portfolio/ai";
import { type SecurityBriefItemWriting, securityBriefWritingSchema } from "../api/brief";

/** Fields of readable text, which the contract requires to start with a capital letter. */
const SENTENCE_FIELDS = ["title", "exploitationStatus", "affected", "fix", "impact"] as const;

const capitalize = (value: unknown): unknown =>
  typeof value === "string" ? value.replace(/^\s*\p{Ll}/u, (start) => start.toUpperCase()) : value;

/**
 * The model is asked to start every sentence with a capital letter; this catches a stray
 * lowercase start, so it never costs a retry. Unknown shapes pass through untouched for the
 * contract to reject.
 */
function capitalizeSentences(output: unknown): unknown {
  const reply = asObject(output);
  if (!Array.isArray(reply.items)) return output;
  const items: unknown[] = reply.items.map((item: unknown) => {
    const fields = asObject(item);
    if (Object.keys(fields).length === 0) return item;
    for (const field of SENTENCE_FIELDS) {
      if (field in fields) fields[field] = capitalize(fields[field]);
    }
    return fields;
  });
  return { ...reply, items };
}

/** Ids that are missing, unknown or repeated, as validation problems. */
function idProblems(items: readonly SecurityBriefItemWriting[], ids: readonly string[]): string[] {
  const returned = items.map((item) => item.id);
  const problems: string[] = [];
  const missing = ids.filter((id) => !returned.includes(id));
  if (missing.length > 0) problems.push(`✖ Missing groups: ${missing.join(", ")}`);
  const unknown = returned.filter((id) => !ids.includes(id));
  if (unknown.length > 0) problems.push(`✖ Unknown groups: ${unknown.join(", ")}`);
  const repeated = returned.filter((id, index) => returned.indexOf(id) !== index);
  if (repeated.length > 0) problems.push(`✖ Repeated groups: ${[...new Set(repeated)].join(", ")}`);
  return problems;
}

/**
 * Asks the model for one item per group id and checks the reply: the contract, and every id
 * exactly once. A failure goes back to the model once with the problems listed.
 */
export async function writeGroups(input: {
  api: StructuredApi;
  system: string;
  request: string;
  ids: readonly string[];
}): Promise<{ items: Map<string, SecurityBriefItemWriting>; usage: Usage }> {
  const { value, usage } = await generateValidated({
    api: input.api,
    system: input.system,
    prompt: input.request,
    schema: securityBriefWritingSchema,
    prepare: capitalizeSentences,
    check: (reply) => idProblems(reply.items, input.ids),
    retryHint: "Include one item for every group.",
  });
  return { items: new Map(value.items.map((item) => [item.id, item])), usage };
}

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
