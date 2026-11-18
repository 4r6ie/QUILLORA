import "server-only";

import { unstable_cache } from "next/cache";

import { cacheTags, cacheTimes } from "@/lib/cache/keys";
import { prismaRead } from "@/lib/db/read";
import {
  articleInclude,
  attachTags,
} from "@/features/articles/queries";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import type { SearchResult } from "@/types";

/**
 * Full-text search (requirements 5, 8).
 *
 * Uses a PostgreSQL GIN index over `to_tsvector(title || excerpt || content)`
 * (created in migration 0002) and `plainto_tsquery`, so user input is bound as
 * a parameter and never concatenated into SQL. Results are page-bounded and
 * the total comes from COUNT(*), never by loading all rows.
 *
 * NOTE: the tsvector expression is inlined in the template because Prisma's
 * `$queryRaw` treats `${...}` interpolations as bind parameters, not SQL.
 */
export const searchArticles = unstable_cache(
  async (rawQuery: string, page = 1, limit = DEFAULT_PAGE_SIZE): Promise<SearchResult> => {
    const query = rawQuery.trim().slice(0, 200);
    const safeLimit = Math.min(limit, 50);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    if (!query) {
      return { items: [], total: 0, page: 1, limit: safeLimit, totalPages: 0, query: "" };
    }

    const countRows = await prismaRead.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM articles a
      WHERE a.status = 'published'
        AND a.published_at IS NOT NULL
        AND to_tsvector('english',
              coalesce(a.title, '') || ' ' ||
              coalesce(a.excerpt, '') || ' ' ||
              coalesce(a.content, ''))
            @@ plainto_tsquery('english', ${query})
    `;
    const total = Number(countRows[0]?.count ?? 0);
    const totalPages = Math.ceil(total / safeLimit);

    if (total === 0 || offset >= total) {
      return { items: [], total, page: safePage, limit: safeLimit, totalPages, query };
    }

    const rows = await prismaRead.$queryRaw<{ id: string }[]>`
      SELECT a.id
      FROM articles a
      WHERE a.status = 'published'
        AND a.published_at IS NOT NULL
        AND to_tsvector('english',
              coalesce(a.title, '') || ' ' ||
              coalesce(a.excerpt, '') || ' ' ||
              coalesce(a.content, ''))
            @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank(
                to_tsvector('english',
                  coalesce(a.title, '') || ' ' ||
                  coalesce(a.excerpt, '') || ' ' ||
                  coalesce(a.content, '')),
                plainto_tsquery('english', ${query})
              ) DESC,
              a.published_at DESC
      LIMIT ${safeLimit} OFFSET ${offset}
    `;

    const ids = rows.map((row: { id: string }) => row.id);
    const articles = await prismaRead.article.findMany({
      where: { id: { in: ids } },
      include: articleInclude,
    });

    // Restore relevance ordering returned by the raw query.
    const order = new Map(ids.map((id: string, index: number) => [id, index]));
    articles.sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );

    const items = await attachTags(
      articles as unknown as Parameters<typeof attachTags>[0],
    );

    return { items, total, page: safePage, limit: safeLimit, totalPages, query };
  },
  ["search"],
  { revalidate: cacheTimes.search, tags: [cacheTags.search, cacheTags.articles] },
);
