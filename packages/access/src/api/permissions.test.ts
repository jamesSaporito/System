import { describe, expect, it } from "vitest";

import { PERMISSION_PRESETS, PERMISSIONS, updateMemberPermissionsSchema } from "./permissions";

describe("updateMemberPermissionsSchema", () => {
  it("accepts known permissions and drops duplicates", () => {
    expect(
      updateMemberPermissionsSchema.parse({ permissions: ["DASHBOARD", "SESSIONS", "DASHBOARD"] }),
    ).toEqual({ permissions: ["DASHBOARD", "SESSIONS"] });
  });

  it("accepts an empty list, which revokes everything", () => {
    expect(updateMemberPermissionsSchema.parse({ permissions: [] })).toEqual({ permissions: [] });
  });

  it("rejects unknown permissions, including members, which is admin-only", () => {
    expect(updateMemberPermissionsSchema.safeParse({ permissions: ["MEMBERS"] }).success).toBe(
      false,
    );
    expect(updateMemberPermissionsSchema.safeParse({ permissions: ["dashboard"] }).success).toBe(
      false,
    );
  });

  it("rejects unknown fields", () => {
    expect(updateMemberPermissionsSchema.safeParse({ permissions: [], extra: 1 }).success).toBe(
      false,
    );
  });
});

describe("PERMISSION_PRESETS", () => {
  it("only contains known permissions, and full grants every tab", () => {
    for (const preset of Object.values(PERMISSION_PRESETS)) {
      for (const permission of preset) expect(PERMISSIONS).toContain(permission);
    }
    expect(PERMISSION_PRESETS.full.toSorted()).toEqual(PERMISSIONS.toSorted());
  });
});
