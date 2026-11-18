import { describe, expect, it } from "vitest";

import {
  initials,
  makeExcerpt,
  readingTime,
  slugify,
  truncate,
} from "@/lib/utils";

describe("utils", () => {
  it("slugifies titles safely", () => {
    expect(slugify("Hello, World! 2026")).toBe("hello-world-2026");
    expect(slugify("  Multiple   spaces  ")).toBe("multiple-spaces");
    expect(slugify("Café au lait")).toBe("cafe-au-lait");
  });

  it("estimates reading time at 200 wpm", () => {
    expect(readingTime("")).toBe(1);
    expect(readingTime(Array(400).fill("word").join(" "))).toBe(2);
    expect(readingTime(Array(100).fill("word").join(" "))).toBe(1);
  });

  it("builds plain-text excerpts", () => {
    expect(makeExcerpt("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
    expect(makeExcerpt("short", 3)).toBe("sho…");
  });

  it("computes initials", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("")).toBe("?");
    expect(initials(null, "X")).toBe("X");
  });

  it("truncates long text", () => {
    expect(truncate("abcdef", 3)).toBe("abc…");
    expect(truncate("abc", 3)).toBe("abc");
  });
});
