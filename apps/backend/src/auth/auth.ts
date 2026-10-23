import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins/admin";
import type { PrismaClient } from "@portfolio/db";
import type { Env } from "../env";

/** Error code on the admin's sign-in redirect when GitHub sign-in is refused. */
export const ACCOUNT_NOT_ALLOWED = "account_not_allowed";

export function createAuth(env: Env, prisma: PrismaClient) {
  const allowedGithubIds = new Set(env.ADMIN_GITHUB_IDS);

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    trustedOrigins: [env.ADMIN_URL],
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
    user: {
      // Runs before a user is created and on every GitHub sign-in, with the fresh GitHub profile,
      // so strangers never get a row and removing an ID locks that user out on their next sign-in.
      validateUserInfo: ({ source }) => {
        const id = source.oauth?.providerId === "github" ? source.oauth.profile?.id : undefined;
        // GitHub sends a number; accept a string too in case Better Auth normalizes it.
        const githubId = typeof id === "number" || typeof id === "string" ? String(id) : undefined;
        if (githubId === undefined || !allowedGithubIds.has(githubId)) {
          return {
            error: ACCOUNT_NOT_ALLOWED,
            errorDescription: "This GitHub account isn't allowed to sign in.",
          };
        }
        return undefined;
      },
    },
    // Only allowlisted users can exist, and all of them are admins.
    plugins: [admin({ defaultRole: "admin" })],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
