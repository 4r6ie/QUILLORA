import { z } from "zod";

/**
 * Cursor pagination (requirement 8).
 *
 * Lists are always bounded: an explicit `limit` (default 12, hard max 50) and
 * a cursor. The cursor encodes the sort key(s) of the last item, so pagination
 * stays stable even while articles are published between pages.
 *
 * We never load an entire collection: every list query uses `take: limit + 1`
 * and returns `hasMore`.
 */

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

export const paginationQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(DEFAULT_PAGE_SIZE)
    .transform((value) => Math.min(value, MAX_PAGE_SIZE)),
  cursor: z.string().optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
});

export type PaginationInput = z.infer<typeof paginationQuerySchema>;

export function parsePagination(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): PaginationInput {
  const record: Record<string, string | undefined> = {};
  if (params instanceof URLSearchParams) {
    for (const key of ["limit", "cursor", "page"]) {
      record[key] = params.get(key) ?? undefined;
    }
  } else {
    for (const key of ["limit", "cursor", "page"]) {
      const value = params[key];
      record[key] = Array.isArray(value) ? value[0] : value;
    }
  }
  return paginationQuerySchema.parse(record);
}

/** Cursor payload: the sort key of the last item on the previous page. */
export type CursorPayload = {
  publishedAt: string;
  id: string;
};

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as Partial<CursorPayload>;
    if (typeof parsed.id !== "string" || typeof parsed.publishedAt !== "string") {
      return null;
    }
    const date = new Date(parsed.publishedAt);
    if (Number.isNaN(date.getTime())) return null;
    return { id: parsed.id, publishedAt: parsed.publishedAt };
  } catch {
    return null;
  }
}

export type PageInfo = {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
};

/**
 * Build page metadata from a list of `limit + 1` rows.
 * `toCursor` extracts the cursor fields from a row.
 */
export function buildPageInfo<T extends { id: string; publishedAt?: Date | null }>(
  rows: T[],
  limit: number,
  fallbackDate?: Date,
): { items: T[]; pageInfo: PageInfo } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          id: last.id,
          publishedAt: (
            last.publishedAt ??
            fallbackDate ??
            new Date(0)
          ).toISOString(),
        })
      : null;
  return {
    items,
    pageInfo: { nextCursor, hasMore, limit },
  };
}
