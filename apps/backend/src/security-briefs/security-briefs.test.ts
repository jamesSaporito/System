import type { SecurityBriefItemInput, SecuritySeverity } from "@portfolio/contracts";
import { createPrismaClient } from "@portfolio/db";
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
import { SecurityNewsScheduler } from "./security-news.scheduler";
import { SecurityBriefsService } from "./security-briefs.service";
import { SecurityNewsService } from "./security-news.service";

const ADMIN = 3000;
const MEMBER = 3001;

const env = testEnv({ ADMIN_GITHUB_IDS: [String(ADMIN)] });
const prisma = createPrismaClient(env.DATABASE_URL);
const cookies = new Map<number, string>();

let behavior: Behavior;
let now: Date;
const apps: TestApp[] = [];

/** An app whose clock is `now` and whose model is the fake, unless `model` is false. */
async function startApp(overrides: { schedule?: boolean; model?: boolean } = {}) {
  const app = await createTestApp(
    { ...env, SECURITY_NEWS_SCHEDULE: overrides.schedule ?? false },
    { now: () => now, ...(overrides.model === false ? {} : { model: fakeModel(behavior) }) },
  );
  apps.push(app);
  return app;
}

let testApp: TestApp;

/** Runs and briefs from RUN_ON on: dates no real brief will have. */
const testDates = { runOn: { gte: new Date(RUN_ON) } };

async function cleanUp() {
  await prisma.securityBrief.deleteMany({ where: testDates });
  await prisma.securityBriefRun.deleteMany({ where: testDates });
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.member.deleteMany({ where: { githubId: String(MEMBER) } });
}

async function signIn(app: TestApp, githubId: number) {
  const result = await app.signIn(githubId);
  if (!("cookie" in result)) throw new Error(`Sign-in failed for ${githubId}: ${result.error}`);
  cookies.set(githubId, result.cookie);
}

function as(githubId: number, path: string, init: RequestInit = {}, app = testApp) {
  const headers = new Headers(init.headers);
  headers.set("Cookie", cookies.get(githubId) ?? "");
  return app.request(path, { ...init, headers });
}

const run = (githubId: number, app = testApp) =>
  as(githubId, "/security-briefs/run", { method: "POST" }, app);

const idle = (app = testApp) => app.app.get(SecurityNewsService).whenIdle();

const storedSchema = z.looseObject({
  markdown: z.string(),
  items: z.array(z.looseObject({ section: z.string(), position: z.number(), subject: z.string() })),
});
const listSchema = z.object({ briefs: z.array(z.looseObject({ runOn: z.string() })) });

async function stored() {
  return storedSchema.parse(await (await as(ADMIN, `/security-briefs/${RUN_ON}`)).json());
}

function deferred() {
  const gate: { promise: Promise<void>; resolve: () => void } = {
    promise: Promise.resolve(),
    resolve: () => {},
  };
  gate.promise = new Promise<void>((resolve) => {
    gate.resolve = resolve;
  });
  return gate;
}

const briefCount = () => prisma.securityBrief.count({ where: { runOn: new Date(RUN_ON) } });

const runOutcomes = async () =>
  (
    await prisma.securityBriefRun.findMany({
      where: { runOn: new Date(RUN_ON) },
      orderBy: { createdAt: "asc" },
    })
  ).map((logged) => logged.outcome);

beforeAll(async () => {
  fakeGithub({ user3001: MEMBER });
});

beforeEach(async () => {
  await cleanUp();
  cookies.clear();
  behavior = { prompts: [], domains: [] };
  now = new Date(`${RUN_ON}T13:00:00Z`);
  await prisma.member.create({ data: { githubId: String(MEMBER), githubLogin: "user3001" } });
  testApp = await startApp();
  await signIn(testApp, ADMIN);
  await signIn(testApp, MEMBER);
});

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => idle(app).then(() => app.app.close())));
});

afterAll(async () => {
  await cleanUp();
  await prisma.$disconnect();
  vi.unstubAllGlobals();
});

describe("running the brief", () => {
  it("starts a run that stores the brief, readable by date", async () => {
    expect((await run(ADMIN)).status).toBe(202);
    await idle();

    const { briefs } = listSchema.parse(await (await as(ADMIN, "/security-briefs")).json());
    expect(briefs[0]).toMatchObject({ runOn: RUN_ON, itemCount: 3 });
    const current = await stored();
    expect(current.markdown).toBe("# Security News\n\nThe researched brief.");
    expect(current.items.map((item) => [item.section, item.position])).toEqual([
      ["ACTIVELY_EXPLOITED", 0],
      ["CRITICAL_AND_HIGH", 0],
      ["WORTH_KNOWING", 0],
    ]);
  });

  it("replaces the day's brief on a rerun", async () => {
    await run(ADMIN);
    await idle();
    await run(ADMIN);
    await idle();

    expect(await briefCount()).toBe(1);
  });

  it("hands the research the newest brief from an earlier day, never the one it replaces", async () => {
    await run(ADMIN);
    await idle();
    await run(ADMIN);
    await idle();
    expect(behavior.prompts[1]).not.toContain("The researched brief.");

    now = new Date("2999-01-02T13:00:00Z");
    await run(ADMIN);
    await idle();
    expect(behavior.prompts[2]).toContain("The researched brief.");
    expect(behavior.prompts[2]).toContain(`from ${RUN_ON}`);
  });

  it("stores nothing when there is nothing new, and logs the run", async () => {
    behavior.nothingNew = true;
    expect((await run(ADMIN)).status).toBe(202);
    await idle();

    expect(await briefCount()).toBe(0);
    expect(await runOutcomes()).toEqual(["NOTHING_NEW"]);
  });

  it("is for admins only, even members who can read the Vulnerability Report tab", async () => {
    await prisma.member.update({
      where: { githubId: String(MEMBER) },
      data: { permissions: ["SECURITY"] },
    });
    expect((await run(MEMBER)).status).toBe(403);
    expect(behavior.prompts).toEqual([]);
  });

  it("refuses a second run while one is going", async () => {
    const gate = deferred();
    behavior.gate = gate.promise;

    expect((await run(ADMIN)).status).toBe(202);
    expect((await run(ADMIN)).status).toBe(409);

    gate.resolve();
    await idle();
    expect(await briefCount()).toBe(1);
    expect(behavior.prompts).toHaveLength(1);
  });

  it("stores nothing when a run fails, and can be run again", async () => {
    behavior.fail = true;
    expect((await run(ADMIN)).status).toBe(202);
    await idle();
    expect(await briefCount()).toBe(0);

    behavior.fail = false;
    expect((await run(ADMIN)).status).toBe(202);
    await idle();
    expect(await briefCount()).toBe(1);
    expect(await runOutcomes()).toEqual(["FAILED", "STORED"]);
  });

  it("says so when there is no Anthropic key", async () => {
    const keyless = await startApp({ model: false });
    await signIn(keyless, ADMIN);
    expect((await run(ADMIN, keyless)).status).toBe(503);
  });
});

describe("running from the command line", () => {
  it("waits for the run and reports whether it stored a brief", async () => {
    const service = testApp.app.get(SecurityNewsService);
    behavior.fail = true;
    expect(await service.runNow()).toBe("failed");
    expect(await briefCount()).toBe(0);

    behavior.fail = false;
    expect(await service.runNow()).toBe("stored");
    expect(await briefCount()).toBe(1);
  });

  it("reports a day with nothing new", async () => {
    behavior.nothingNew = true;
    expect(await testApp.app.get(SecurityNewsService).runNow()).toBe("nothing new");
  });

  it("doesn't start a second run while one is going", async () => {
    const gate = deferred();
    behavior.gate = gate.promise;
    const service = testApp.app.get(SecurityNewsService);

    const first = service.runNow();
    expect(await service.runNow()).toBe("running");
    gate.resolve();
    expect(await first).toBe("stored");
  });

  it("says so when there is no Anthropic key", async () => {
    const keyless = await startApp({ model: false });
    expect(await keyless.app.get(SecurityNewsService).runNow()).toBe("unconfigured");
  });
});

describe("the daily schedule", () => {
  it("waits for the run hour, then runs once for the day", async () => {
    const service = testApp.app.get(SecurityNewsService);

    now = new Date(`${RUN_ON}T11:00:00Z`);
    expect(await service.runScheduled()).toBe("not due");
    expect(await briefCount()).toBe(0);

    now = new Date(`${RUN_ON}T12:00:00Z`);
    expect(await service.runScheduled()).toBe("started");
    await idle();
    expect(await briefCount()).toBe(1);

    expect(await service.runScheduled()).toBe("not due");
    expect(behavior.prompts).toHaveLength(1);
  });

  it("doesn't rerun a day that found nothing new, but retries a day that failed", async () => {
    const service = testApp.app.get(SecurityNewsService);

    behavior.fail = true;
    expect(await service.runScheduled()).toBe("started");
    await idle();
    behavior.fail = false;
    behavior.nothingNew = true;
    expect(await service.runScheduled()).toBe("started");
    await idle();

    expect(await service.runScheduled()).toBe("not due");
    expect(await runOutcomes()).toEqual(["FAILED", "NOTHING_NEW"]);
  });

  it("does nothing unless SECURITY_NEWS_SCHEDULE is on", async () => {
    await testApp.app.get(SecurityNewsScheduler).daily();
    await idle();
    expect(await briefCount()).toBe(0);
  });

  it("runs the daily trigger when it is on", async () => {
    const scheduled = await startApp({ schedule: true });
    await idle(scheduled);
    // Starting after the run hour already caught up; the trigger itself then has nothing to do.
    await vi.waitFor(async () => expect(await briefCount()).toBe(1));
    await scheduled.app.get(SecurityNewsScheduler).daily();
    await idle(scheduled);
    expect(behavior.prompts).toHaveLength(1);
  });

  it("catches up at startup when the run was missed", async () => {
    await startApp({ schedule: true });
    await vi.waitFor(async () => expect(await briefCount()).toBe(1));
  });
});

/** A "Critical and High" item with the given severity and score. */
const headed = (
  subject: string,
  severity: SecuritySeverity,
  cvssScore: number | null,
): SecurityBriefItemInput => ({
  section: "CRITICAL_AND_HIGH",
  subject,
  title: "Remote code execution",
  advisoryIds: [],
  severity,
  cvssScore,
  cvssVersion: null,
  exploitationStatus: null,
  kevAddedOn: null,
  affected: "All versions",
  fix: "Upgrade",
  publishedOn: null,
  impact: "Widely used.",
  isUpdate: false,
  updateNote: null,
  sources: [{ label: "Vendor", url: "https://example.com/advisory" }],
});

describe("reading briefs", () => {
  beforeEach(async () => {
    await run(ADMIN);
    await idle();
  });

  it("returns a brief's source links", async () => {
    const current = await stored();
    expect(current.items[0]).toMatchObject({
      subject: "PHP",
      kevAddedOn: "2998-12-28",
      sources: [{ label: "Vendor", url: "https://example.com/advisory" }],
    });
  });

  it("lists each section by severity, then CVSS score, then the brief's own order", async () => {
    await testApp.app.get(SecurityBriefsService).upsert({
      runOn: RUN_ON,
      coversFrom: "2998-12-25",
      coversTo: RUN_ON,
      mostUrgent: "Nothing critical",
      markdown: "# Security News",
      items: [
        headed("Medium", "MEDIUM", 6.5),
        headed("High, no score", "HIGH", null),
        headed("High 7.5", "HIGH", 7.5),
        headed("Critical", "CRITICAL", 9.1),
        headed("High 8.8", "HIGH", 8.8),
      ],
    });

    expect((await stored()).items.map((item) => item.subject)).toEqual([
      "Critical",
      "High 8.8",
      "High 7.5",
      "High, no score",
      "Medium",
    ]);
  });

  it("gives 404 for a date with no brief and 400 for a malformed one", async () => {
    expect((await as(ADMIN, "/security-briefs/2998-01-01")).status).toBe(404);
    expect((await as(ADMIN, "/security-briefs/yesterday")).status).toBe(400);
  });

  it("is only for members granted the Vulnerability Report tab", async () => {
    expect((await as(MEMBER, "/security-briefs")).status).toBe(403);
    expect((await as(MEMBER, `/security-briefs/${RUN_ON}`)).status).toBe(403);

    await prisma.member.update({
      where: { githubId: String(MEMBER) },
      data: { permissions: ["SECURITY"] },
    });
    expect((await as(MEMBER, "/security-briefs")).status).toBe(200);
    expect((await as(MEMBER, `/security-briefs/${RUN_ON}`)).status).toBe(200);
  });
});
