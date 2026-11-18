import { describe, expect, it } from "vitest";

import {
  buildPageInfo,
  decodeCursor,
  encodeCursor,
  paginationQuerySchema,
  DEFAULT_PAGE_SIZE,
} from "@/lib/pagination";

describe("pagination", () => {
  it("round-trips a cursor", () => {
    const payload = { publishedAt: "2026-01-01T00:00:00.000Z", id: "abc" };
    expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
  });

  it("rejects malformed cursors", () => {
    expect(decodeCursor("not-base64!!")).toBeNull();
    expect(decodeCursor(encodeCursor({ publishedAt: "nope", id: "abc" }))).toBeNull();
  });

  it("flags hasMore and trims the extra row", () => {
    const rows = Array.from({ length: 6 }, (_, index) => ({
      id: String(index),
      publishedAt: new Date(1000 - index),
    }));
    const { items, pageInfo } = buildPageInfo(rows, 5);
    expect(items).toHaveLength(5);
    expect(pageInfo.hasMore).toBe(true);
    expect(pageInfo.nextCursor).toBeTruthy();
  });

  it("does not flag hasMore on an exact page", () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      id: String(index),
      publishedAt: new Date(1000 - index),
    }));
    const { pageInfo } = buildPageInfo(rows, 5);
    expect(pageInfo.hasMore).toBe(false);
    expect(pageInfo.nextCursor).toBeNull();
  });

  it("clamps limits to the maximum", () => {
    expect(paginationQuerySchema.parse({ limit: "500" }).limit).toBe(50);
    expect(paginationQuerySchema.parse({}).limit).toBe(DEFAULT_PAGE_SIZE);
  });
});
