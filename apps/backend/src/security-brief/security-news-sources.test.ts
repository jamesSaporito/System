import { createPrismaClient } from "@portfolio/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { clearSecurityData, isolateSecurityData, RUN_ON } from "@portfolio/security-brief/testing";
import {
  createTestApp,
  fakeGithub,
  type TestApp,
  TEST_EMAIL_DOMAIN,
  testEnv,
} from "../test/support";

const ADMIN = 3100;
const MEMBER = 3101;

const env = testEnv({ ADMIN_GITHUB_IDS: [String(ADMIN)] });
const prisma = createPrismaClient(env.DATABASE_URL);
const cookies = new Map<number, string>();

let app: TestApp;

function as(githubId: number, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cookie", cookies.get(githubId) ?? "");
  if (init.body) headers.set("Content-Type", "application/json");
  return app.request(path, { ...init, headers });
}

const json = (body: unknown, method = "POST") => ({ method, body: JSON.stringify(body) });

const listSchema = z.object({
  feeds: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      createdAt: z.string(),
      fetchedAt: z.string().nullable(),
    }),
  ),
});
const list = async () => listSchema.parse(await (await as(ADMIN, "/security-news/feeds")).json());

// The feeds are shared in the local database: they're set aside while these tests run.
isolateSecurityData(prisma, RUN_ON);

beforeAll(() => {
  fakeGithub({ user3101: MEMBER });
});

beforeEach(async () => {
  await clearSecurityData(prisma, RUN_ON);
  await prisma.member.create({ data: { githubId: String(MEMBER), githubLogin: "user3101" } });
  app = await createTestApp(env);
  for (const githubId of [ADMIN, MEMBER]) {
    const result = await app.signIn(githubId);
    if (!("cookie" in result)) throw new Error(`Sign-in failed for ${githubId}: ${result.error}`);
    cookies.set(githubId, result.cookie);
  }
});

afterEach(async () => {
  await app.app.close();
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.member.deleteMany({ where: { githubId: String(MEMBER) } });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("security news feeds", () => {
  it("are for admins only, even members who can read the Vulnerability Report tab", async () => {
    await prisma.member.update({
      where: { githubId: String(MEMBER) },
      data: { permissions: ["SECURITY"] },
    });
    expect((await as(MEMBER, "/security-news/feeds")).status).toBe(403);
    expect(
      (await as(MEMBER, "/security-news/feeds", json({ url: "https://example.com/feed/" }))).status,
    ).toBe(403);
  });

  it("can be added once each, listed in order, and removed", async () => {
    const first = await as(
      ADMIN,
      "/security-news/feeds",
      json({ url: " https://a.example/feed/ " }),
    );
    expect(first.status).toBe(201);
    await as(ADMIN, "/security-news/feeds", json({ url: "https://b.example/rss.xml" }));
    const again = await as(ADMIN, "/security-news/feeds", json({ url: "https://a.example/feed/" }));
    expect(again.status).toBe(409);
    expect((await as(ADMIN, "/security-news/feeds", json({ url: "a.example" }))).status).toBe(400);

    const { feeds } = await list();
    expect(feeds.map((feed) => [feed.url, feed.fetchedAt])).toEqual([
      ["https://a.example/feed/", null],
      ["https://b.example/rss.xml", null],
    ]);

    const removed = await as(ADMIN, `/security-news/feeds/${feeds[0]?.id}`, { method: "DELETE" });
    expect(removed.status).toBe(204);
    expect((await list()).feeds).toHaveLength(1);
    const missing = await as(ADMIN, `/security-news/feeds/${feeds[0]?.id}`, { method: "DELETE" });
    expect(missing.status).toBe(404);
  });

  it("show when each was last read", async () => {
    const read = new Date(`${RUN_ON}T13:00:00Z`);
    await prisma.securityNewsFeed.create({
      data: { url: "https://a.example/feed/", fetchedAt: read },
    });
    expect((await list()).feeds[0]?.fetchedAt).toBe(read.toISOString());
  });
});
