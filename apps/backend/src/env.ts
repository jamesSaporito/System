import { Global, Module } from "@nestjs/common";
import { accessEnvSchema } from "@portfolio/access";
import { checkSecurityBriefEnv, securityBriefEnvSchema } from "@portfolio/security-brief";
import { z } from "zod";

/** The backend's own variables plus each package's, checked together at startup. */
const envSchema = z
  .object({
    PORT: z.coerce.number().int().default(4000),
    DATABASE_URL: z.url(),
    ...accessEnvSchema.shape,
    ...securityBriefEnvSchema.shape,
  })
  .superRefine(checkSecurityBriefEnv);

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
