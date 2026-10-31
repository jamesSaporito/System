import { Global, Module } from "@nestjs/common";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.url(),
  /// Public URL of this backend; Better Auth builds OAuth callback URLs from it.
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  /// Comma-separated numeric GitHub user IDs of admins, who manage members.
  ADMIN_GITHUB_IDS: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().regex(/^\d+$/, "must be numeric GitHub user IDs")).min(1)),
  /// Origin of apps/admin: allowed for CORS and as a post-sign-in redirect.
  ADMIN_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Injection token for the validated environment. Tests override it with their own values. */
export const ENV = Symbol("ENV");

@Global()
@Module({ providers: [{ provide: ENV, useFactory: loadEnv }], exports: [ENV] })
export class EnvModule {}
