import { describe, expect, it } from "vitest";
import { isDue, runDate } from "./schedule";

describe("isDue", () => {
  it("waits for the run hour", () => {
    expect(isDue(new Date("2026-10-31T11:59:59Z"), false)).toBe(false);
  });

  it("is due from the run hour on when today has no brief", () => {
    expect(isDue(new Date("2026-10-31T12:00:00Z"), false)).toBe(true);
    expect(isDue(new Date("2026-10-31T23:59:00Z"), false)).toBe(true);
  });

  it("is not due once today has a brief", () => {
    expect(isDue(new Date("2026-10-31T15:00:00Z"), true)).toBe(false);
  });
});

describe("runDate", () => {
  it("is the UTC date", () => {
    expect(runDate(new Date("2026-10-31T23:30:00-05:00"))).toBe("2026-11-01");
  });
});
