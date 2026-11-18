import { describe, expect, it } from "vitest";

import { cacheTags, cacheTimes } from "@/lib/cache/keys";

describe("cache registry", () => {
  it("builds per-entity tags", () => {
    expect(cacheTags.article("hello")).toBe("article:hello");
    expect(cacheTags.category("tech")).toBe("category:tech");
    expect(cacheTags.author("ada")).toBe("author:ada");
    expect(cacheTags.tag("web")).toBe("tag:web");
  });

  it("keeps public cache lifetimes bounded", () => {
    expect(cacheTimes.article).toBeGreaterThan(0);
    expect(cacheTimes.feed).toBeGreaterThan(0);
    expect(cacheTimes.search).toBeLessThanOrEqual(60);
  });
});
