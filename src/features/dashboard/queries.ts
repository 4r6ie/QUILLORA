import "server-only";

import { prisma } from "@/lib/db/client";
import { buildPageInfo, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import type { ArticleListResult, ArticleCard } from "@/types";

export type MyArticle = ArticleCard & {
  status: "draft" | "in_review" | "published" | "archived";
  updatedAt: string;
};

export type MyArticleListResult = Omit<ArticleListResult, "items"> & {
  items: MyArticle[];
};

type MyArticleRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  readingTime: number;
  publishedAt: Date | null;
  status: "draft" | "in_review" | "published" | "archived";
  updatedAt: Date;
};

/**
 * Dashboard reads (author's own articles). These are write-side reads: never
 * cached publicly, always fresh, and always scoped to the acting user.
 */
export async function getMyArticles(
  authorId: string,
  options: { limit?: number; cursor?: string | null } = {},
): Promise<MyArticleListResult> {
  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, 50);
  const cursor = options.cursor ? decodeCursorSafe(options.cursor) : null;

  const rows = (await prisma.article.findMany({
    where: {
      authorId,
      ...(cursor
        ? {
            OR: [
              { updatedAt: { lt: new Date(cursor.publishedAt) } },
              {
                updatedAt: new Date(cursor.publishedAt),
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  })) as MyArticleRow[];

  const { items, pageInfo } = buildPageInfo(rows, limit);
  return {
    items: items.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt ?? "",
      coverImageUrl: row.coverImageUrl,
      readingTime: row.readingTime,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      author: {
        id: authorId,
        username: "",
        fullName: null,
        avatarUrl: null,
      },
      category: null,
      tags: [],
    })),
    ...pageInfo,
  };
}

function decodeCursorSafe(cursor: string): { publishedAt: string; id: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      publishedAt?: string;
      id?: string;
    };
    if (!parsed.id || !parsed.publishedAt) return null;
    return { id: parsed.id, publishedAt: parsed.publishedAt };
  } catch {
    return null;
  }
}

export async function getArticleForEditing(articleId: string) {
  return prisma.article.findUnique({
    where: { id: articleId },
    include: {
      author: { select: { id: true, username: true, fullName: true } },
      category: { select: { id: true, slug: true, name: true } },
      tags: { include: { tag: { select: { slug: true, name: true } } } },
    },
  });
}
