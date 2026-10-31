import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { PrismaClient } from "@portfolio/db";
import type { Env } from "../env";

/** Error code on the admin's sign-in redirect when GitHub sign-in is refused. */
export const ACCOUNT_NOT_ALLOWED = "account_not_allowed";

const GITHUB = "github";

export function createAuth(env: Env, prisma: PrismaClient) {
  const adminIds = new Set(env.ADMIN_GITHUB_IDS);

  /** Admins and anyone on the members list. */
  async function canSignIn(githubId: string): Promise<boolean> {
    if (adminIds.has(githubId)) return true;
    return (await prisma.member.count({ where: { githubId } })) > 0;
  }

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
      // so strangers never get a row and removing a member locks them out.
      validateUserInfo: async ({ source }) => {
        const id = source.oauth?.providerId === GITHUB ? source.oauth.profile?.id : undefined;
        // GitHub sends a number; accept a string too in case Better Auth normalizes it.
        const githubId = typeof id === "number" || typeof id === "string" ? String(id) : undefined;
        if (githubId !== undefined && (await canSignIn(githubId))) return undefined;
        return {
          error: ACCOUNT_NOT_ALLOWED,
          errorDescription: "This GitHub account isn't allowed to sign in.",
        };
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
