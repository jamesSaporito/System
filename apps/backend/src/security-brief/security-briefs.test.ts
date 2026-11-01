import { createPrismaClient, type SecuritySeverity } from "@portfolio/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createTestApp,
  fakeGithub,
  type TestApp,
  TEST_EMAIL_DOMAIN,
  testEnv,
} from "../test/support";
import {
  advisoryRow,
  type Behavior,
  clearSecurityData,
  emptyFeeds,
  type FakeFeeds,
  fakeFeedFetch,
  fakeModel,
  isolateSecurityData,
  kevRow,
  RUN_ON,
  rssFeed,
} from "@portfolio/security-brief/testing";
import { SecurityBriefRunner } from "@portfolio/security-brief";
import { SecurityBriefScheduler } from "./security-brief.scheduler";

const ADMIN = 3000;
const MEMBER = 3001;
const NEXT_DAY = "2999-01-02";

const env = testEnv({ ADMIN_GITHUB_IDS: [String(ADMIN)] });
const prisma = createPrismaClient(env.DATABASE_URL);
const cookies = new Map<number, string>();

let behavior: Behavior;
let feeds: FakeFeeds;
/** Feed URLs requested, in order. */
let requested: string[];
let now: Date;
const apps: TestApp[] = [];

/** An app whose clock is `now`, whose feeds are `feeds`, and whose model is the fake. */
async function startApp(overrides: { schedule?: boolean; model?: boolean } = {}) {
  const app = await createTestApp(
    { ...env, SECURITY_NEWS_SCHEDULE: overrides.schedule ?? false },
    {
      now: () => now,
      // Read on every request, so tests can change `feeds` between runs.
      feedFetch: (url, init) => fakeFeedFetch(feeds, requested)(url, init),
      ...(overrides.model === false ? {} : { model: fakeModel(behavior) }),
    },
  );
  apps.push(app);
  return app;
}

let testApp: TestApp;

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

const run = (githubId: number, app = testApp, body: object = {}) =>
  as(
    githubId,
    "/security-briefs/run",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    app,
  );

const idle = (app = testApp) => app.app.get(SecurityBriefRunner).whenIdle();

/** Runs as the admin and waits for the run to end. */
async function runAndWait() {
  expect((await run(ADMIN)).status).toBe(202);
  await idle();
}

const daysSchema = z.object({
  days: z.array(z.object({ day: z.string(), itemCount: z.number(), updatedCount: z.number() })),
});
const daySchema = z.object({
  day: z.string(),
  items: z.array(
    z.looseObject({
      section: z.string(),
      subject: z.string(),
      title: z.string(),
      advisoryIds: z.array(z.string()),
      isUpdate: z.boolean(),
      updateNote: z.string().nullable(),
      firstSeenOn: z.string(),
    }),
  ),
});

const days = async () => daysSchema.parse(await (await as(ADMIN, "/security-briefs")).json()).days;
const day = async (date = RUN_ON) =>
  daySchema.parse(await (await as(ADMIN, `/security-briefs/${date}`)).json()).items;

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

const itemCount = () => prisma.securityBriefItem.count();
const waitingCount = () => prisma.securityFeedEntry.count({ where: { itemId: null } });

const runs = () =>
  prisma.securityBriefRun.findMany({
    where: { runOn: { gte: new Date(RUN_ON) } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
const runOutcomes = async () => (await runs()).map((logged) => logged.outcome);

isolateSecurityData(prisma, RUN_ON);

beforeAll(() => {
  fakeGithub({ user3001: MEMBER });
});

beforeEach(async () => {
  await clearSecurityData(prisma, RUN_ON);
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.member.deleteMany({ where: { githubId: String(MEMBER) } });
  cookies.clear();
  behavior = { requests: [] };
  requested = [];
  // An exploited CVE that GitHub also has, and an unrelated high advisory.
  feeds = {
    ...emptyFeeds(),
    kev: [kevRow("CVE-2999-10001")],
    advisories: [
      advisoryRow("GHSA-2222-3333-4444", "CVE-2999-10001"),
      advisoryRow("GHSA-5555-6666-7777", "CVE-2999-20002", "high"),
    ],
  };
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
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.member.deleteMany({ where: { githubId: String(MEMBER) } });
  vi.unstubAllGlobals();
});

describe("running the brief", () => {
  it("stores the feeds' entries, groups them by CVE, and lists the items by day", async () => {
    await runAndWait();

    expect(behavior.requests).toHaveLength(1);
    expect(await days()).toEqual([{ day: RUN_ON, itemCount: 2, updatedCount: 0 }]);
    expect((await day()).map((item) => [item.section, item.advisoryIds, item.isUpdate])).toEqual([
      ["ACTIVELY_EXPLOITED", ["CVE-2999-10001", "GHSA-2222-3333-4444"], false],
      ["CRITICAL_AND_HIGH", ["CVE-2999-20002", "GHSA-5555-6666-7777"], false],
    ]);
    expect(await waitingCount()).toBe(0);
    expect(await runs()).toMatchObject([
      { outcome: "STORED", newEntries: 3, newItems: 2, updatedItems: 0, feedFailures: [] },
    ]);
  });

  it("sends the model nothing when a rerun finds nothing new", async () => {
    await runAndWait();
    await runAndWait();

    expect(behavior.requests).toHaveLength(1);
    expect(await itemCount()).toBe(2);
    expect(await runOutcomes()).toEqual(["STORED", "NOTHING_NEW"]);
  });

  it("sends only new entries on a rerun, adding items without changing the others", async () => {
    await runAndWait();
    const before = await day();
    // Published after the first read, as anything new the next read finds is.
    feeds.advisories.push({
      ...advisoryRow("GHSA-8888-9999-cccc", "CVE-2999-30003"),
      published_at: `${RUN_ON}T13:30:00Z`,
    });
    now = new Date(`${RUN_ON}T14:00:00Z`);
    await runAndWait();

    expect(behavior.requests[1]).toContain("GHSA-8888-9999-cccc");
    expect(behavior.requests[1]).not.toContain("GHSA-5555-6666-7777");
    const after = await day();
    expect(after).toHaveLength(3);
    expect(after).toEqual(expect.arrayContaining(before));
  });

  it("reads each source from where the last run stopped", async () => {
    await runAndWait();
    now = new Date(`${NEXT_DAY}T13:00:00Z`);
    await runAndWait();

    const advisoryQueries = requested
      .filter((url) => url.includes("severity=critical"))
      .map((url) => new URL(url).searchParams.get("published"));
    // First read: the last 24 hours. Then from the previous read, an hour back.
    expect(advisoryQueries).toEqual([">=2998-12-31", `>=${RUN_ON}`]);
    const settings = await prisma.securityNewsSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(settings.advisoriesFetchedAt).toEqual(now);
    expect(settings.kevFetchedAt).toEqual(now);
  });

  it("reads the last 24 hours again when asked, storing only entries it didn't have", async () => {
    await runAndWait();
    const stored = await prisma.securityFeedEntry.count();
    // An hour later the cursors would only reach back to the first run.
    now = new Date(now.getTime() + 60 * 60 * 1000);
    await prisma.securityFeedEntry.deleteMany({ where: { source: "KEV" } });

    expect((await run(ADMIN, testApp, { fullDay: true })).status).toBe(202);
    await idle();

    const advisoryQueries = requested
      .filter((url) => url.includes("severity=critical"))
      .map((url) => new URL(url).searchParams.get("published"));
    expect(advisoryQueries[1]).toBe(advisoryQueries[0]);
    expect(await prisma.securityFeedEntry.count()).toBe(stored);
    expect((await runs()).at(-1)?.newEntries).toBe(1);
    const settings = await prisma.securityNewsSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(settings.kevFetchedAt).toEqual(now);
  });

  it("rejects a run request with an unknown option", async () => {
    expect((await run(ADMIN, testApp, { everything: true })).status).toBe(400);
    expect(requested).toEqual([]);
  });

  it("keeps entries waiting when writing fails, and writes them next time without rereading", async () => {
    behavior.fail = true;
    await runAndWait();
    expect(await itemCount()).toBe(0);
    expect(await waitingCount()).toBe(3);

    behavior.fail = false;
    feeds = emptyFeeds();
    await runAndWait();
    expect(await itemCount()).toBe(2);
    expect(await waitingCount()).toBe(0);
    expect(await runs()).toMatchObject([
      { outcome: "FAILED", newEntries: 3, newItems: 0 },
      { outcome: "STORED", newEntries: 0, newItems: 2 },
    ]);
  });

  it("updates an item when CISA KEV adds its CVE later, listing it on that day too", async () => {
    await runAndWait();
    now = new Date(`${NEXT_DAY}T13:00:00Z`);
    feeds.kev.push(kevRow("CVE-2999-20002", NEXT_DAY));
    await runAndWait();

    expect(await days()).toEqual([
      { day: NEXT_DAY, itemCount: 1, updatedCount: 1 },
      { day: RUN_ON, itemCount: 2, updatedCount: 0 },
    ]);
    const [updated] = await day(NEXT_DAY);
    expect(updated).toMatchObject({
      section: "ACTIVELY_EXPLOITED",
      advisoryIds: ["CVE-2999-20002", "GHSA-5555-6666-7777"],
      isUpdate: true,
      updateNote: "Added to CISA KEV",
      firstSeenOn: RUN_ON,
    });
    // The model rewrote it from all its entries, the earlier advisory included.
    expect(behavior.requests[1]).toMatch(/GHSA-5555-6666-7777[\s\S]*CVE-2999-20002/);
    expect(await itemCount()).toBe(2);
    expect((await runs()).at(-1)).toMatchObject({ newItems: 0, updatedItems: 1 });
  });

  it("adds a news article that mentions a known CVE to that item", async () => {
    await runAndWait();
    const feed = "https://news.example.com/feed/";
    await prisma.securityNewsFeed.create({ data: { url: feed } });
    feeds.rss[feed] = rssFeed([
      {
        url: "https://news.example.com/php-exploited/",
        title: "CVE-2999-10001 exploited, CISA warns",
        published: `${RUN_ON}T14:00:00Z`,
      },
      {
        url: "https://news.example.com/other/",
        title: "A new zero-day vulnerability",
        published: `${RUN_ON}T14:00:00Z`,
      },
    ]);
    now = new Date(`${RUN_ON}T15:00:00Z`);
    await runAndWait();

    const items = await day();
    expect(items).toHaveLength(3);
    // First seen today, so it isn't marked as an update.
    expect(items[0]).toMatchObject({ advisoryIds: ["CVE-2999-10001", "GHSA-2222-3333-4444"] });
    expect(items[0]?.isUpdate).toBe(false);
    expect(items.at(-1)).toMatchObject({ section: "WORTH_KNOWING", advisoryIds: [] });
    expect((await runs()).at(-1)).toMatchObject({ newItems: 1, updatedItems: 1 });
  });

  it("fails without calling the model when neither KEV nor GitHub can be read", async () => {
    feeds.down = ["kev", "github"];
    await runAndWait();

    expect(behavior.requests).toEqual([]);
    const [failed] = await runs();
    expect(failed).toMatchObject({ outcome: "FAILED", newEntries: 0 });
    expect(failed?.error).toMatch(/Neither CISA KEV nor GitHub advisories/);
    expect(failed?.feedFailures).toEqual([
      { source: "CISA KEV", reason: "HTTP 503" },
      { source: "GitHub advisories", reason: "HTTP 503" },
    ]);
    // Their cursors stay, so the next run reads the same period.
    expect(await prisma.securityNewsSettings.findUnique({ where: { id: 1 } })).toMatchObject({
      kevFetchedAt: null,
      advisoriesFetchedAt: null,
    });
  });

  it("is for admins only, even members who can read the Vulnerability Report tab", async () => {
    await prisma.member.update({
      where: { githubId: String(MEMBER) },
      data: { permissions: ["SECURITY"] },
    });
    expect((await run(MEMBER)).status).toBe(403);
    expect(requested).toEqual([]);
  });

  it("refuses a second run while one is going", async () => {
    const gate = deferred();
    behavior.gate = gate.promise;

    expect((await run(ADMIN)).status).toBe(202);
    expect((await run(ADMIN)).status).toBe(409);

    gate.resolve();
    await idle();
    expect(behavior.requests).toHaveLength(1);
  });

  it("says so when there is no Anthropic key", async () => {
    const keyless = await startApp({ model: false });
    await signIn(keyless, ADMIN);
    expect((await run(ADMIN, keyless)).status).toBe(503);
  });
});

const statusSchema = z.object({
  running: z.object({ startedAt: z.string() }).nullable(),
  lastRun: z
    .looseObject({ runOn: z.string(), outcome: z.string(), error: z.string().nullable() })
    .nullable(),
});

async function status() {
  return statusSchema.parse(await (await as(ADMIN, "/security-briefs/status")).json());
}

describe("run status", () => {
  it("shows a run in progress, then how it ended and what it found", async () => {
    const gate = deferred();
    behavior.gate = gate.promise;
    await run(ADMIN);
    expect((await status()).running).toEqual({ startedAt: now.toISOString() });

    gate.resolve();
    await idle();
    expect(await status()).toMatchObject({
      running: null,
      lastRun: {
        runOn: RUN_ON,
        outcome: "STORED",
        error: null,
        newEntries: 3,
        newItems: 2,
        updatedItems: 0,
      },
    });
  });

  it("says why the last run failed", async () => {
    behavior.fail = true;
    await runAndWait();

    const { lastRun } = await status();
    expect(lastRun).toMatchObject({ runOn: RUN_ON, outcome: "FAILED" });
    expect(lastRun?.error).toMatch(/failed validation/);
  });

  it("reports a run with nothing new", async () => {
    feeds = emptyFeeds();
    await runAndWait();
    expect((await status()).lastRun).toMatchObject({ outcome: "NOTHING_NEW", error: null });
  });

  it("is for admins only, even members who can read the Vulnerability Report tab", async () => {
    await prisma.member.update({
      where: { githubId: String(MEMBER) },
      data: { permissions: ["SECURITY"] },
    });
    expect((await as(MEMBER, "/security-briefs/status")).status).toBe(403);
  });
});

describe("the daily schedule", () => {
  it("waits for the run hour, then runs once for the day", async () => {
    const service = testApp.app.get(SecurityBriefRunner);

    now = new Date(`${RUN_ON}T11:00:00Z`);
    expect(await service.runScheduled()).toBe("not due");
    expect(requested).toEqual([]);

    now = new Date(`${RUN_ON}T12:00:00Z`);
    expect(await service.runScheduled()).toBe("started");
    await idle();
    expect(await itemCount()).toBe(2);

    expect(await service.runScheduled()).toBe("not due");
    expect(behavior.requests).toHaveLength(1);
  });

  it("doesn't rerun a day that ran, but retries a day that failed", async () => {
    const service = testApp.app.get(SecurityBriefRunner);

    behavior.fail = true;
    expect(await service.runScheduled()).toBe("started");
    await idle();
    behavior.fail = false;
    expect(await service.runScheduled()).toBe("started");
    await idle();

    expect(await service.runScheduled()).toBe("not due");
    expect(await runOutcomes()).toEqual(["FAILED", "STORED"]);
  });

  it("does nothing unless SECURITY_NEWS_SCHEDULE is on", async () => {
    await testApp.app.get(SecurityBriefScheduler).daily();
    await idle();
    expect(await runOutcomes()).toEqual([]);
  });

  it("catches up at startup when the run was missed, and the trigger then has nothing to do", async () => {
    const scheduled = await startApp({ schedule: true });
    await vi.waitFor(async () => expect(await runOutcomes()).toEqual(["STORED"]));
    await idle(scheduled);
    await scheduled.app.get(SecurityBriefScheduler).daily();
    await idle(scheduled);
    expect(behavior.requests).toHaveLength(1);
  });
});

/** An item first seen on `firstSeenOn`, written straight to the database. */
const storedItem = (
  subject: string,
  severity: SecuritySeverity | null,
  cvssScore: number | null,
  firstSeenOn = "2999-01-05",
) =>
  prisma.securityBriefItem.create({
    data: {
      section: severity ? "CRITICAL_AND_HIGH" : "WORTH_KNOWING",
      subject,
      title: "Remote code execution",
      severity,
      cvssScore,
      sources: [{ label: "GitHub advisory", url: "https://github.com/advisories" }],
      firstSeenOn: new Date(firstSeenOn),
    },
  });

describe("reading the brief", () => {
  it("lists a day's items by section, severity, then CVSS score", async () => {
    await storedItem("Story", null, null);
    await storedItem("Medium", "MEDIUM", 6.5);
    await storedItem("High, no score", "HIGH", null);
    await storedItem("High 7.5", "HIGH", 7.5);
    await storedItem("Critical", "CRITICAL", 9.1);
    await storedItem("High 8.8", "HIGH", 8.8);

    expect((await day("2999-01-05")).map((item) => item.subject)).toEqual([
      "Critical",
      "High 8.8",
      "High 7.5",
      "High, no score",
      "Medium",
      "Story",
    ]);
  });

  it("gives 404 for a day with no items and 400 for a malformed one", async () => {
    expect((await as(ADMIN, "/security-briefs/2998-01-01")).status).toBe(404);
    expect((await as(ADMIN, "/security-briefs/yesterday")).status).toBe(400);
  });

  it("is only for members granted the Vulnerability Report tab", async () => {
    await storedItem("Story", null, null, RUN_ON);
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
