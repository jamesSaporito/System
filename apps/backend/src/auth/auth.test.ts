import { createPrismaClient } from "@portfolio/db";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Env } from "../env";
import { ACCOUNT_NOT_ALLOWED, createAuth } from "./auth";

const ALLOWED_ID = 1001;
const STRANGER_ID = 1003;
const TEST_EMAIL_DOMAIN = "@auth-test.invalid";
const ADMIN_URL = "http://localhost:3001";
const BACKEND_URL = "http://localhost:4000";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required; see .env.example");

const prisma = createPrismaClient(databaseUrl);

const env: Env = {
  PORT: 0,
  DATABASE_URL: databaseUrl,
  BETTER_AUTH_URL: BACKEND_URL,
  BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
  GITHUB_CLIENT_ID: "test",
  GITHUB_CLIENT_SECRET: "test",
  ADMIN_GITHUB_IDS: [String(ALLOWED_ID)],
  ADMIN_URL,
};

/** Fakes GitHub's OAuth token exchange and user APIs for one GitHub account. */
function fakeGithub(githubId: number) {
  const email = `${githubId}${TEST_EMAIL_DOMAIN}`;
  vi.stubGlobal("fetch", async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith("https://github.com/login/oauth/access_token")) {
      return Response.json({ access_token: "gh-token", token_type: "bearer", scope: "read:user" });
    }
    if (url === "https://api.github.com/user") {
      return Response.json({
        id: githubId,
        login: `user${githubId}`,
        name: null,
        email,
        avatar_url: null,
      });
    }
    if (url === "https://api.github.com/user/emails") {
      return Response.json([{ email, primary: true, verified: true }]);
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  });
}

/** Runs the browser flow: start GitHub sign-in, then hit the callback as GitHub would redirect. */
async function signInWithGithub(auth: ReturnType<typeof createAuth>) {
  const start = await auth.handler(
    new Request(`${BACKEND_URL}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ADMIN_URL },
      body: JSON.stringify({
        provider: "github",
        callbackURL: `${ADMIN_URL}/`,
        errorCallbackURL: `${ADMIN_URL}/sign-in/`,
      }),
    }),
  );
  const { url } = z.object({ url: z.string() }).parse(await start.json());
  const state = new URL(url).searchParams.get("state");
  const cookies = start.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

  const callback = await auth.handler(
    new Request(`${BACKEND_URL}/api/auth/callback/github?code=test-code&state=${state}`, {
      headers: { Cookie: cookies },
    }),
  );
  return new URL(callback.headers.get("Location") ?? "", ADMIN_URL);
}

async function sessionCount(githubId: number) {
  return prisma.session.count({ where: { user: { email: `${githubId}${TEST_EMAIL_DOMAIN}` } } });
}

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.$disconnect();
});

describe("GitHub sign-in allowlist", () => {
  it("creates allowlisted users as admins and signs them in", async () => {
    fakeGithub(ALLOWED_ID);
    const redirect = await signInWithGithub(createAuth(env, prisma));

    expect(redirect.href).toBe(`${ADMIN_URL}/`);
    const user = await prisma.user.findUnique({
      where: { email: `${ALLOWED_ID}${TEST_EMAIL_DOMAIN}` },
      include: { accounts: true },
    });
    expect(user?.role).toBe("admin");
    expect(user?.accounts).toMatchObject([{ providerId: "github", accountId: String(ALLOWED_ID) }]);
    expect(await sessionCount(ALLOWED_ID)).toBe(1);
  });

  it("refuses anyone else without creating a user", async () => {
    fakeGithub(STRANGER_ID);
    const redirect = await signInWithGithub(createAuth(env, prisma));

    expect(redirect.pathname).toBe("/sign-in/");
    expect(redirect.searchParams.get("error")).toBe(ACCOUNT_NOT_ALLOWED);
    expect(
      await prisma.user.count({ where: { email: `${STRANGER_ID}${TEST_EMAIL_DOMAIN}` } }),
    ).toBe(0);
  });

  it("refuses returning users once removed from the allowlist", async () => {
    fakeGithub(ALLOWED_ID);
    await signInWithGithub(createAuth(env, prisma));
    expect(await sessionCount(ALLOWED_ID)).toBe(1);

    const delisted = createAuth({ ...env, ADMIN_GITHUB_IDS: ["9999"] }, prisma);
    const redirect = await signInWithGithub(delisted);

    expect(redirect.searchParams.get("error")).toBe(ACCOUNT_NOT_ALLOWED);
    expect(await sessionCount(ALLOWED_ID)).toBe(1);
  });
});
