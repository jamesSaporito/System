import { createPrismaClient } from "@portfolio/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTestApp,
  fakeGithub,
  type TestApp,
  TEST_EMAIL_DOMAIN,
  testEnv,
} from "../test/support";

const PLATFORM_ADMIN = 2000;
const OWNER_A = 2001;
const EDITOR_A = 2002;
const OWNER_B = 2003;
const NEWCOMER = 2004;
const SLUG_PREFIX = "access-test-";

const env = testEnv({ ADMIN_GITHUB_IDS: [String(PLATFORM_ADMIN)] });
const prisma = createPrismaClient(env.DATABASE_URL);
let testApp: TestApp;
let siteA: string;
let siteB: string;
const cookies = new Map<number, string>();

async function cleanUp() {
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.site.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
}

/** Invites each GitHub ID to a site, then signs them in so the invite becomes a membership. */
async function addMember(githubId: number, siteId: string, role: "OWNER" | "EDITOR") {
  await prisma.siteInvite.create({
    data: { siteId, githubId: String(githubId), githubLogin: `user${githubId}`, role },
  });
  await signIn(githubId);
}

async function signIn(githubId: number) {
  const result = await testApp.signIn(githubId);
  if (!("cookie" in result)) throw new Error(`Sign-in failed for ${githubId}: ${result.error}`);
  cookies.set(githubId, result.cookie);
}

function as(githubId: number | null, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (githubId !== null) headers.set("Cookie", cookies.get(githubId) ?? "");
  if (init.body) headers.set("Content-Type", "application/json");
  return testApp.request(path, { ...init, headers });
}

beforeAll(async () => {
  fakeGithub({ newcomer: NEWCOMER, user2002: EDITOR_A });
  testApp = await createTestApp(env);
});

beforeEach(async () => {
  await cleanUp();
  cookies.clear();
  siteA = (await prisma.site.create({ data: { slug: `${SLUG_PREFIX}a`, name: "A" } })).id;
  siteB = (await prisma.site.create({ data: { slug: `${SLUG_PREFIX}b`, name: "B" } })).id;
  await signIn(PLATFORM_ADMIN);
  await addMember(OWNER_A, siteA, "OWNER");
  await addMember(EDITOR_A, siteA, "EDITOR");
  await addMember(OWNER_B, siteB, "OWNER");
});

afterAll(async () => {
  await cleanUp();
  await testApp.app.close();
  await prisma.$disconnect();
  vi.unstubAllGlobals();
});

describe("site isolation", () => {
  it("requires a session", async () => {
    expect((await as(null, "/me")).status).toBe(401);
  });

  it("lists only the sites a member belongs to", async () => {
    const me = await (await as(EDITOR_A, "/me")).json();
    expect(me).toMatchObject({ isPlatformAdmin: false, sites: [{ id: siteA, role: "EDITOR" }] });
  });

  it("hides other sites behind 404s, even from their owners", async () => {
    expect((await as(OWNER_A, `/sites/${siteB}/members`)).status).toBe(404);
    expect((await as(EDITOR_A, `/sites/${siteB}/members`)).status).toBe(404);
    const rename = await as(OWNER_A, `/sites/${siteB}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "x" }),
    });
    expect(rename.status).toBe(404);
  });

  it("lets platform admins into every site as an owner", async () => {
    expect(await (await as(PLATFORM_ADMIN, "/me")).json()).toMatchObject({ isPlatformAdmin: true });
    expect((await as(PLATFORM_ADMIN, `/sites/${siteB}/members`)).status).toBe(200);
  });
});

describe("roles", () => {
  it("keeps editors out of owner-only routes", async () => {
    expect((await as(EDITOR_A, `/sites/${siteA}/members`)).status).toBe(403);
    const rename = await as(EDITOR_A, `/sites/${siteA}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "x" }),
    });
    expect(rename.status).toBe(403);
  });

  it("only lets platform admins create sites", async () => {
    const body = JSON.stringify({ slug: `${SLUG_PREFIX}c`, name: "C" });
    expect((await as(OWNER_A, "/sites", { method: "POST", body })).status).toBe(403);
    expect((await as(PLATFORM_ADMIN, "/sites", { method: "POST", body })).status).toBe(201);
  });

  it("validates request bodies", async () => {
    const body = JSON.stringify({ slug: "Not A Slug", name: "" });
    expect((await as(PLATFORM_ADMIN, "/sites", { method: "POST", body })).status).toBe(400);
  });
});

describe("members", () => {
  it("lets owners invite by GitHub username, claimed on first sign-in", async () => {
    const invite = await as(OWNER_A, `/sites/${siteA}/invites`, {
      method: "POST",
      body: JSON.stringify({ githubLogin: "newcomer", role: "EDITOR" }),
    });
    expect(await invite.json()).toEqual({ status: "invited" });

    await signIn(NEWCOMER);
    expect(await (await as(NEWCOMER, "/me")).json()).toMatchObject({
      sites: [{ id: siteA, role: "EDITOR" }],
    });
  });

  it("adds existing users directly and rejects unknown GitHub usernames", async () => {
    const existing = await as(OWNER_B, `/sites/${siteB}/invites`, {
      method: "POST",
      body: JSON.stringify({ githubLogin: "user2002", role: "EDITOR" }),
    });
    expect(await existing.json()).toEqual({ status: "added" });

    const unknown = await as(OWNER_B, `/sites/${siteB}/invites`, {
      method: "POST",
      body: JSON.stringify({ githubLogin: "nobody-here", role: "EDITOR" }),
    });
    expect(unknown.status).toBe(400);
  });

  it("signs people out when they're removed from their last site", async () => {
    const editor = await prisma.user.findUniqueOrThrow({
      where: { email: `${EDITOR_A}${TEST_EMAIL_DOMAIN}` },
    });
    expect(
      (await as(OWNER_A, `/sites/${siteA}/members/${editor.id}`, { method: "DELETE" })).status,
    ).toBe(204);
    expect((await as(EDITOR_A, "/me")).status).toBe(401);
  });

  it("never leaves a site without an owner", async () => {
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: `${OWNER_A}${TEST_EMAIL_DOMAIN}` },
    });
    const demote = await as(OWNER_A, `/sites/${siteA}/members/${owner.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role: "EDITOR" }),
    });
    expect(demote.status).toBe(409);
  });
});
