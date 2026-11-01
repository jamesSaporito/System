import { describe, expect, it } from "vitest";

import { addSecurityNewsFeedSchema } from "./sources";

describe("addSecurityNewsFeedSchema", () => {
  it("accepts an http(s) feed URL, trimmed", () => {
    expect(addSecurityNewsFeedSchema.parse({ url: " https://example.com/feed/ " })).toEqual({
      url: "https://example.com/feed/",
    });
  });

  it("rejects anything that isn't an http(s) URL, and unknown keys", () => {
    for (const url of ["example.com/feed", "feed://example.com", "ftp://example.com", "", "x"]) {
      expect(addSecurityNewsFeedSchema.safeParse({ url }).success).toBe(false);
    }
    expect(
      addSecurityNewsFeedSchema.safeParse({ url: "https://example.com/feed/", extra: 1 }).success,
    ).toBe(false);
  });
});
