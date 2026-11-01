import { z } from "zod";
import type { ChatMessage, StructuredApi } from "./anthropic";
import { addUsage, noUsage, type Usage } from "./usage";

/** The reply still failed validation after every attempt; `usage` is what the attempts cost. */
export class AiValidationError extends Error {
  readonly usage: Usage;

  constructor(message: string, usage: Usage) {
    super(message);
    this.name = "AiValidationError";
    this.usage = usage;
  }
}

/**
 * Sends one request and checks the reply: the schema, then `check`'s own problems. A failing
 * reply goes back to the model with the problems listed, up to `attempts` requests in all.
 */
export async function generateValidated<Schema extends z.ZodType>(input: {
  api: StructuredApi;
  system: string;
  prompt: string;
  schema: Schema;
  /** Tidies the raw reply before it's checked (e.g. fixes something cosmetic that shouldn't cost a retry). */
  prepare?: (output: unknown) => unknown;
  /** Problems the schema can't express, one line each; none means the reply is accepted. */
  check?: (value: z.infer<Schema>) => string[];
  /** Added after the problems when asking again. */
  retryHint?: string;
  attempts?: number;
}): Promise<{ value: z.infer<Schema>; usage: Usage }> {
  const attempts = input.attempts ?? 2;
  const messages: ChatMessage[] = [{ role: "user", content: input.prompt }];
  let usage = noUsage();
  let problems = "";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await input.api({ system: input.system, messages });
    usage = addUsage(usage, result.usage);

    const output = input.prepare ? input.prepare(result.output) : result.output;
    const checked = input.schema.safeParse(output);
    if (checked.success) {
      const found = input.check?.(checked.data) ?? [];
      if (found.length === 0) return { value: checked.data, usage };
      problems = found.join("\n");
    } else {
      problems = z.prettifyError(checked.error);
    }

    const hint = input.retryHint ? ` ${input.retryHint}` : "";
    messages.push(
      { role: "assistant", content: JSON.stringify(result.output ?? null) },
      {
        role: "user",
        content: `That failed validation:\n${problems}\n\nReturn the corrected reply.${hint}`,
      },
    );
  }
  throw new AiValidationError(
    `The model's reply failed validation after ${attempts} attempts:\n${problems}`,
    usage,
  );
}
