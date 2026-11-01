import { z } from "zod";

/** Access's environment variables; the app merges them into its own schema. */
export const accessEnvSchema = z.object({
  /** Public URL of the backend; Better Auth builds OAuth callback URLs from it. */
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  /** Comma-separated numeric GitHub user IDs of admins, who manage members. */
  ADMIN_GITHUB_IDS: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().regex(/^\d+$/, "must be numeric GitHub user IDs")).min(1)),
  /** Origin of apps/admin: allowed for CORS and as a post-sign-in redirect. */
  ADMIN_URL: z.url(),
});

export type AccessEnv = z.infer<typeof accessEnvSchema>;
