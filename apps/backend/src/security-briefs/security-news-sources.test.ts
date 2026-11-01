import { createPrismaClient, type SecurityNewsSource } from "@portfolio/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createTestApp,
  fakeGithub,
  type TestApp,
  TEST_EMAIL_DOMAIN,
  testEnv,
} from "../test/support";
import { type Behavior, fakeModel, RUN_ON } from "./fake-model";
import { SecurityNewsService } from "./security-news.service";

const ADMIN = 3100;
const MEMBER = 3101;

const env = testEnv({ ADMIN_GITHUB_IDS: [String(ADMIN)] });
const prisma = createPrismaClient(env.DATABASE_URL);
const cookies = new Map<number, string>();

// The sources and the toggle are single, shared settings in the local database, so each test
// starts from an empty list with the toggle on, and the real ones are put back at the end.
let saved: { sources: SecurityNewsSource[]; searchBeyondSources: boolean };

async function setSources(urls: string[], searchBeyondSources: boolean) {
  await prisma.securityNewsSource.deleteMany();
  await prisma.securityNewsSource.createMany({ data: urls.map((url) => ({ url })) });
  await prisma.securityNewsSettings.upsert({
    where: { id: 1 },
    create: { id: 1, searchBeyondSources },
    update: { searchBeyondSources },
  });
}

let behavior: Behavior;
let app: TestApp;

function as(githubId: number, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cookie", cookies.get(githubId) ?? "");
  if (init.body) headers.set("Content-Type", "application/json");
  return app.request(path, { ...init, headers });
}

const json = (body: unknown, method = "POST") => ({ method, body: JSON.stringify(body) });

const listSchema = z.object({
  sources: z.array(z.object({ id: z.string(), url: z.string() })),
  searchBeyondSources: z.boolean(),
});
const list = async () => listSchema.parse(await (await as(ADMIN, "/security-news/sources")).json());

beforeAll(async () => {
  fakeGithub({ user3101: MEMBER });
  const settings = await prisma.securityNewsSettings.findUnique({ where: { id: 1 } });
  saved = {
    sources: await prisma.securityNewsSource.findMany(),
    searchBeyondSources: settings?.searchBeyondSources ?? true,
  };
});

beforeEach(async () => {
  await setSources([], true);
  behavior = { prompts: [], domains: [] };
  await prisma.member.create({ data: { githubId: String(MEMBER), githubLogin: "user3101" } });
  app = await createTestApp(env, {
    model: fakeModel(behavior),
    now: () => new Date(`${RUN_ON}T13:00:00Z`),
  });
  for (const githubId of [ADMIN, MEMBER]) {
    const result = await app.signIn(githubId);
    if (!("cookie" in result)) throw new Error(`Sign-in failed for ${githubId}: ${result.error}`);
    cookies.set(githubId, result.cookie);
  }
});

afterEach(async () => {
  await app.app.get(SecurityNewsService).whenIdle();
  await app.app.close();
  await prisma.securityBrief.deleteMany({ where: { runOn: { gte: new Date(RUN_ON) } } });
  await prisma.securityBriefRun.deleteMany({ where: { runOn: { gte: new Date(RUN_ON) } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.member.deleteMany({ where: { githubId: String(MEMBER) } });
});

afterAll(async () => {
  await prisma.securityNewsSource.deleteMany();
  await prisma.securityNewsSource.createMany({ data: saved.sources });
  await setSourcesToggle(saved.searchBeyondSources);
  await prisma.$disconnect();
  vi.unstubAllGlobals();
});

async function setSourcesToggle(searchBeyondSources: boolean) {
  await prisma.securityNewsSettings.update({ where: { id: 1 }, data: { searchBeyondSources } });
}

describe("security news sources", () => {
  it("are for admins only, even members who can read the Vulnerability Report tab", async () => {
    await prisma.member.update({
      where: { githubId: String(MEMBER) },
      data: { permissions: ["SECURITY"] },
    });
    expect((await as(MEMBER, "/security-news/sources")).status).toBe(403);
    expect(
      (await as(MEMBER, "/security-news/sources", json({ url: "https://example.com/" }))).status,
    ).toBe(403);
    expect(
      (await as(MEMBER, "/security-news/settings", json({ searchBeyondSources: false }, "PATCH")))
        .status,
    ).toBe(403);
  });

  it("can be added once each, listed in order, and removed", async () => {
    const first = await as(ADMIN, "/security-news/sources", json({ url: " https://a.example/ " }));
    expect(first.status).toBe(201);
    await as(ADMIN, "/security-news/sources", json({ url: "https://b.example/news" }));
    const again = await as(ADMIN, "/security-news/sources", json({ url: "https://a.example/" }));
    expect(again.status).toBe(409);
    expect((await as(ADMIN, "/security-news/sources", json({ url: "a.example" }))).status).toBe(
      400,
    );

    const { sources } = await list();
    expect(sources.map((source) => source.url)).toEqual([
      "https://a.example/",
      "https://b.example/news",
    ]);

    const removed = await as(ADMIN, `/security-news/sources/${sources[0]?.id}`, {
      method: "DELETE",
    });
    expect(removed.status).toBe(204);
    expect((await list()).sources).toHaveLength(1);
    const missing = await as(ADMIN, `/security-news/sources/${sources[0]?.id}`, {
      method: "DELETE",
    });
    expect(missing.status).toBe(404);
  });

  it("can't be limited to an empty list, or emptied while limited to it", async () => {
    const off = json({ searchBeyondSources: false }, "PATCH");
    expect((await as(ADMIN, "/security-news/settings", off)).status).toBe(400);

    await as(ADMIN, "/security-news/sources", json({ url: "https://a.example/" }));
    expect((await as(ADMIN, "/security-news/settings", off)).status).toBe(200);
    expect((await list()).searchBeyondSources).toBe(false);

    const [only] = (await list()).sources;
    const removed = await as(ADMIN, `/security-news/sources/${only?.id}`, { method: "DELETE" });
    expect(removed.status).toBe(400);
  });

  it("go to the research, which is limited to their domains only when the toggle is off", async () => {
    await setSources(["https://www.cisa.gov/kev", "https://github.com/advisories"], true);
    expect((await as(ADMIN, "/security-briefs/run", { method: "POST" })).status).toBe(202);
    await app.app.get(SecurityNewsService).whenIdle();

    await setSourcesToggle(false);
    expect((await as(ADMIN, "/security-briefs/run", { method: "POST" })).status).toBe(202);
    await app.app.get(SecurityNewsService).whenIdle();

    expect(behavior.prompts[0]).toContain("- https://www.cisa.gov/kev");
    expect(behavior.domains).toEqual([null, ["cisa.gov", "github.com"]]);
  });
});
