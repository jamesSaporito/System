import { Permission } from "@portfolio/db";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "./permissions";

// The API's literals are written by hand so the admin's bundle never pulls in Prisma; this keeps
// them equal to the database enum, so values go in and out of it unmapped.
describe("Permission", () => {
  it("has the same values as the Prisma enum", () => {
    expect([...PERMISSIONS]).toEqual(Object.values(Permission));
  });
});
