import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { vi } from "vitest";
import { z } from "zod";
import { configureApp } from "../app";
import { AppModule } from "../app.module";
import { ENV, type Env } from "../env";

export const ADMIN_URL = "http://localhost:3001";

/** Emails of users created by tests end with this, so cleanup never touches real data. */
export const TEST_EMAIL_DOMAIN = "@auth-test.invalid";

export function testEnv(overrides: Partial<Env> = {}): Env {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required; see .env.example");
  return {
    PORT: 0,
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_URL: "http://localhost:4000",
    BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
    GITHUB_CLIENT_ID: "test",
    GITHUB_CLIENT_SECRET: "test",
    ADMIN_GITHUB_IDS: ["1000"],
    ADMIN_URL,
    ...overrides,
  };
}

export type TestApp = {
  app: NestExpressApplication;
  /** Calls the running app; `path` is relative to its URL. */
  request: (path: string, init?: RequestInit) => Promise<Response>;
  /** Signs in through the real GitHub OAuth flow; returns the session cookie or the error code. */
  signIn: (githubId: number) => Promise<{ cookie: string } | { error: string }>;
};

export async function createTestApp(env: Env): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENV)
    .useValue(env)
    .compile();
  const app = configureApp(
    moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false }),
  );
  await app.listen(0, "127.0.0.1");
  const baseUrl = await app.getUrl();

  const request = (path: string, init: RequestInit = {}) =>
    fetch(`${baseUrl}${path}`, { redirect: "manual", ...init });

  async function signIn(githubId: number) {
    const start = await request("/api/auth/sign-in/social", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ADMIN_URL },
      body: JSON.stringify({
        provider: "github",
        callbackURL: `${ADMIN_URL}/`,
        errorCallbackURL: `${ADMIN_URL}/sign-in/`,
      }),
    });
    const { url } = z.object({ url: z.string() }).parse(await start.json());
    const state = new URL(url).searchParams.get("state") ?? "";
    // The fake GitHub below reads the user's ID back out of the authorization code.
    const callback = await request(`/api/auth/callback/github?code=${githubId}&state=${state}`, {
      headers: { Cookie: cookieHeader(start) },
    });
    const redirect = new URL(callback.headers.get("Location") ?? "", ADMIN_URL);
    const error = redirect.searchParams.get("error");
    return error ? { error } : { cookie: cookieHeader(callback) };
  }

  return { app, request, signIn };
}

function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

/**
 * Fakes GitHub's OAuth and REST APIs. The authorization code is the user's numeric ID, so tests
 * can sign in several identities. `logins` maps usernames to IDs for member lookups.
 */
export function fakeGithub(logins: Record<string, number> = {}): void {
  const realFetch = globalThis.fetch;
  vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname === "github.com" && url.pathname === "/login/oauth/access_token") {
      const body = init?.body;
      const form =
        body instanceof URLSearchParams
          ? body
          : new URLSearchParams(typeof body === "string" ? body : "");
      const code = form.get("code");
      return Response.json({
        access_token: `token-${code}`,
        token_type: "bearer",
        scope: "read:user",
      });
    }
    if (url.hostname === "api.github.com") {
      const auth = new Headers(init?.headers).get("Authorization") ?? "";
      const id = Number(auth.replace(/^(Bearer|token) token-/, ""));
      const email = `${id}${TEST_EMAIL_DOMAIN}`;
      if (url.pathname === "/user") {
        return Response.json({
          id,
          login: `user${id}`,
          name: `User ${id}`,
          email,
          avatar_url: null,
        });
      }
      if (url.pathname === "/user/emails")
        return Response.json([{ email, primary: true, verified: true }]);
      const login = url.pathname.match(/^\/users\/([^/]+)$/)?.[1];
      if (login !== undefined) {
        const loginId = logins[decodeURIComponent(login)];
        return loginId === undefined
          ? Response.json({ message: "Not Found" }, { status: 404 })
          : Response.json({ id: loginId, login: decodeURIComponent(login) });
      }
    }
    return realFetch(input, init);
  });
}
