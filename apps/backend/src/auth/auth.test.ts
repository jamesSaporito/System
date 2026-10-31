import { createPrismaClient } from "@portfolio/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTestApp,
  fakeGithub,
  type TestApp,
  TEST_EMAIL_DOMAIN,
  testEnv,
} from "../test/support";
import { ACCOUNT_NOT_ALLOWED } from "./auth";

const ADMIN = 1000;
const MEMBER = 1001;
const STRANGER = 1002;

const env = testEnv({ ADMIN_GITHUB_IDS: [String(ADMIN)] });
const prisma = createPrismaClient(env.DATABASE_URL);
let testApp: TestApp;

async function cleanUp() {
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.member.deleteMany({ where: { githubId: String(MEMBER) } });
}

beforeAll(async () => {
  fakeGithub();
  testApp = await createTestApp(env);
});

beforeEach(cleanUp);

afterAll(async () => {
  await cleanUp();
  await testApp.app.close();
  await prisma.$disconnect();
  vi.unstubAllGlobals();
});

describe("GitHub sign-in", () => {
  it("lets admins in", async () => {
    const result = await testApp.signIn(ADMIN);
    expect(result).toHaveProperty("cookie");
  });

  it("lets in members added before their first sign-in", async () => {
    await prisma.member.create({ data: { githubId: String(MEMBER), githubLogin: "member" } });

    expect(await testApp.signIn(MEMBER)).toHaveProperty("cookie");
  });

  it("refuses anyone else without creating a user", async () => {
    expect(await testApp.signIn(STRANGER)).toEqual({ error: ACCOUNT_NOT_ALLOWED });
    expect(await prisma.user.count({ where: { email: `${STRANGER}${TEST_EMAIL_DOMAIN}` } })).toBe(
      0,
    );
  });

  it("refuses members once they've been removed", async () => {
    await prisma.member.create({ data: { githubId: String(MEMBER), githubLogin: "member" } });
    await testApp.signIn(MEMBER);
    await prisma.member.deleteMany({ where: { githubId: String(MEMBER) } });

    expect(await testApp.signIn(MEMBER)).toEqual({ error: ACCOUNT_NOT_ALLOWED });
  });
});
