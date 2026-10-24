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

const PLATFORM_ADMIN = 1000;
const INVITED = 1001;
const STRANGER = 1002;
const SITE_SLUG = "auth-test-site";

const env = testEnv({ ADMIN_GITHUB_IDS: [String(PLATFORM_ADMIN)] });
const prisma = createPrismaClient(env.DATABASE_URL);
let testApp: TestApp;

async function cleanUp() {
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.site.deleteMany({ where: { slug: SITE_SLUG } });
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
  it("lets platform admins in", async () => {
    const result = await testApp.signIn(PLATFORM_ADMIN);
    expect(result).toHaveProperty("cookie");
  });

  it("turns an invite into a membership on first sign-in", async () => {
    const site = await prisma.site.create({ data: { slug: SITE_SLUG, name: "Test" } });
    await prisma.siteInvite.create({
      data: { siteId: site.id, githubId: String(INVITED), githubLogin: "invited", role: "EDITOR" },
    });

    expect(await testApp.signIn(INVITED)).toHaveProperty("cookie");

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: `${INVITED}${TEST_EMAIL_DOMAIN}` },
      include: { memberships: true },
    });
    expect(user.memberships).toMatchObject([{ siteId: site.id, role: "EDITOR" }]);
    expect(await prisma.siteInvite.count({ where: { siteId: site.id } })).toBe(0);
  });

  it("refuses anyone else without creating a user", async () => {
    expect(await testApp.signIn(STRANGER)).toEqual({ error: ACCOUNT_NOT_ALLOWED });
    expect(await prisma.user.count({ where: { email: `${STRANGER}${TEST_EMAIL_DOMAIN}` } })).toBe(
      0,
    );
  });

  it("refuses members once they've been removed from their last site", async () => {
    const site = await prisma.site.create({ data: { slug: SITE_SLUG, name: "Test" } });
    await prisma.siteInvite.create({
      data: { siteId: site.id, githubId: String(INVITED), githubLogin: "invited", role: "EDITOR" },
    });
    await testApp.signIn(INVITED);
    await prisma.siteMember.deleteMany({ where: { siteId: site.id } });

    expect(await testApp.signIn(INVITED)).toEqual({ error: ACCOUNT_NOT_ALLOWED });
  });
});
