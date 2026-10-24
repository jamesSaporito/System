import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { PrismaClient } from "@portfolio/db";
import type { Env } from "../env";

/** Error code on the admin's sign-in redirect when GitHub sign-in is refused. */
export const ACCOUNT_NOT_ALLOWED = "account_not_allowed";

const GITHUB = "github";

export function createAuth(env: Env, prisma: PrismaClient) {
  const platformAdminIds = new Set(env.ADMIN_GITHUB_IDS);

  /** Platform admins, anyone with a pending invite, and anyone who still belongs to a site. */
  async function canSignIn(githubId: string): Promise<boolean> {
    if (platformAdminIds.has(githubId)) return true;
    const [invites, memberships] = await Promise.all([
      prisma.siteInvite.count({ where: { githubId } }),
      prisma.siteMember.count({
        where: { user: { accounts: { some: { providerId: GITHUB, accountId: githubId } } } },
      }),
    ]);
    return invites + memberships > 0;
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
      // so strangers never get a row and removing someone's last membership locks them out.
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
    databaseHooks: {
      account: {
        create: {
          // First sign-in: turn this GitHub account's pending invites into memberships.
          after: async (account) => {
            if (account.providerId !== GITHUB) return;
            const invites = await prisma.siteInvite.findMany({
              where: { githubId: account.accountId },
            });
            if (invites.length === 0) return;
            await prisma.$transaction([
              prisma.siteMember.createMany({
                data: invites.map(({ siteId, role }) => ({ siteId, role, userId: account.userId })),
                skipDuplicates: true,
              }),
              prisma.siteInvite.deleteMany({ where: { githubId: account.accountId } }),
            ]);
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
