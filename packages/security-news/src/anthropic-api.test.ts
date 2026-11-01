import { describe, expect, it } from "vitest";
import { researchParams } from "./anthropic-api";

describe("researchParams", () => {
  it("turns on prompt caching for the research request", () => {
    const params = researchParams("system", [{ role: "user", content: "research" }]);
    expect(params.cache_control).toEqual({ type: "ephemeral" });
  });

  it("limits both web tools to the allowed domains, and neither without them", () => {
    const messages = [{ role: "user" as const, content: "research" }];
    const limited = researchParams("system", messages, ["cisa.gov"]);
    expect(limited.tools).toMatchObject([
      { name: "web_search", allowed_domains: ["cisa.gov"] },
      { name: "web_fetch", allowed_domains: ["cisa.gov"] },
    ]);
    for (const tool of researchParams("system", messages).tools ?? []) {
      expect(tool).not.toHaveProperty("allowed_domains");
    }
  });
});
