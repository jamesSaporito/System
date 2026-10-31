import { createPrismaClient } from "@portfolio/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createTestApp,
  fakeGithub,
  type TestApp,
  TEST_EMAIL_DOMAIN,
  testEnv,
} from "../test/support";

const ADMIN = 2000;
const MEMBER = 2001;
const NEWCOMER = 2002;
const TEST_GITHUB_IDS = [MEMBER, NEWCOMER].map(String);

const env = testEnv({ ADMIN_GITHUB_IDS: [String(ADMIN)] });
const prisma = createPrismaClient(env.DATABASE_URL);
let testApp: TestApp;
const cookies = new Map<number, string>();

async function cleanUp() {
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.member.deleteMany({ where: { githubId: { in: TEST_GITHUB_IDS } } });
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

function addMember(githubLogin: string) {
  return as(ADMIN, "/members", { method: "POST", body: JSON.stringify({ githubLogin }) });
}

const membersSchema = z.object({
  members: z.array(z.object({ id: z.string(), githubLogin: z.string() }).loose()),
});

async function listMembers() {
  return membersSchema.parse(await (await as(ADMIN, "/members")).json());
}

async function memberId(githubLogin: string): Promise<string> {
  const member = (await listMembers()).members.find((m) => m.githubLogin === githubLogin);
  if (!member) throw new Error(`${githubLogin} isn't a member`);
  return member.id;
}

beforeAll(async () => {
  fakeGithub({ user2001: MEMBER, newcomer: NEWCOMER });
  testApp = await createTestApp(env);
});

beforeEach(async () => {
  await cleanUp();
  cookies.clear();
  await prisma.member.create({ data: { githubId: String(MEMBER), githubLogin: "user2001" } });
  await signIn(ADMIN);
  await signIn(MEMBER);
});

afterAll(async () => {
  await cleanUp();
  await testApp.app.close();
  await prisma.$disconnect();
  vi.unstubAllGlobals();
});

describe("access", () => {
  it("requires a session", async () => {
    expect((await as(null, "/me")).status).toBe(401);
  });

  it("tells admins and members apart", async () => {
    expect(await (await as(ADMIN, "/me")).json()).toMatchObject({ isAdmin: true });
    expect(await (await as(MEMBER, "/me")).json()).toMatchObject({ isAdmin: false });
  });

  it("only lets admins manage members", async () => {
    const id = await memberId("user2001");
    expect((await as(MEMBER, "/members")).status).toBe(403);
    const body = JSON.stringify({ githubLogin: "newcomer" });
    expect((await as(MEMBER, "/members", { method: "POST", body })).status).toBe(403);
    expect((await as(MEMBER, `/members/${id}`, { method: "DELETE" })).status).toBe(403);
  });

  it("refuses a session whose member was removed outside the API", async () => {
    await prisma.member.deleteMany({ where: { githubId: String(MEMBER) } });
    expect((await as(MEMBER, "/me")).status).toBe(403);
  });
});

describe("members", () => {
  it("lists members, with their profile once they've signed in", async () => {
    expect((await addMember("newcomer")).status).toBe(201);

    const { members } = await listMembers();
    expect(members).toMatchObject([
      { githubLogin: "user2001", user: { name: `User ${MEMBER}` } },
      { githubLogin: "newcomer", user: null },
    ]);
  });

  it("lets added members sign in", async () => {
    await addMember("newcomer");
    await signIn(NEWCOMER);
    expect((await as(NEWCOMER, "/me")).status).toBe(200);
  });

  it("rejects unknown GitHub users and duplicates", async () => {
    expect((await addMember("nobody-here")).status).toBe(400);
    expect((await addMember("user2001")).status).toBe(409);
    expect((await addMember("not a username")).status).toBe(400);
  });

  it("signs removed members out", async () => {
    const id = await memberId("user2001");

    expect((await as(ADMIN, `/members/${id}`, { method: "DELETE" })).status).toBe(204);
    expect((await as(MEMBER, "/me")).status).toBe(401);
    expect((await as(ADMIN, `/members/${id}`, { method: "DELETE" })).status).toBe(404);
  });
});
