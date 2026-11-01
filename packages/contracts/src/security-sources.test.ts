import { describe, expect, it } from "vitest";

import { addSecurityNewsSourceSchema, updateSecurityNewsSettingsSchema } from "./security-sources";

describe("addSecurityNewsSourceSchema", () => {
  it("accepts an http(s) URL, trimmed", () => {
    expect(addSecurityNewsSourceSchema.parse({ url: " https://www.cisa.gov/news " })).toEqual({
      url: "https://www.cisa.gov/news",
    });
  });

  it("rejects anything that isn't an http(s) URL", () => {
    for (const url of ["cisa.gov", "ftp://example.com", "", "not a url"]) {
      expect(addSecurityNewsSourceSchema.safeParse({ url }).success).toBe(false);
    }
  });
});

describe("updateSecurityNewsSettingsSchema", () => {
  it("takes the toggle and nothing else", () => {
    expect(updateSecurityNewsSettingsSchema.safeParse({ searchBeyondSources: false }).success).toBe(
      true,
    );
    expect(updateSecurityNewsSettingsSchema.safeParse({ searchBeyondSources: "no" }).success).toBe(
      false,
    );
    expect(
      updateSecurityNewsSettingsSchema.safeParse({ searchBeyondSources: true, extra: 1 }).success,
    ).toBe(false);
  });
});
