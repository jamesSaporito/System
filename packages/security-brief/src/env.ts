import { z } from "zod";

/** The brief's environment variables; the app merges them into its own schema. */
export const securityBriefEnvSchema = z.object({
  /** Writes the daily security brief. Unset turns the brief off. */
  ANTHROPIC_API_KEY: z
    .string()
    .optional()
    .transform((key) => key || undefined),
  /**
   * Whether this instance writes the brief by itself every day (12:00 UTC, and at startup if
   * that was missed). Off by default so a dev stack never spends money; needs ANTHROPIC_API_KEY.
   */
  SECURITY_NEWS_SCHEDULE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type SecurityBriefEnv = z.infer<typeof securityBriefEnvSchema>;

/** Rules across the brief's variables, for the app's merged schema (`.superRefine`). */
export function checkSecurityBriefEnv(env: SecurityBriefEnv, context: z.RefinementCtx): void {
  if (env.SECURITY_NEWS_SCHEDULE && env.ANTHROPIC_API_KEY === undefined) {
    context.addIssue({
      code: "custom",
      path: ["SECURITY_NEWS_SCHEDULE"],
      message: "needs ANTHROPIC_API_KEY",
    });
  }
}
