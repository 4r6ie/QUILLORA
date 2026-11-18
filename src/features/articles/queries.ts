import "server-only";

import { unstable_cache } from "next/cache";

import { cacheTags, cacheTimes } from "@/lib/cache/keys";
import { prismaRead } from "@/lib/db/read";
import {
  buildPageInfo,
  decodeCursor,
  DEFAULT_PAGE_SIZE,
  type PageInfo,
} from "@/lib/pagination";
import { retry } from "@/lib/resilience/retry";
import { makeExcerpt } from "@/lib/utils";
import type {
  ArticleCard,
  ArticleListResult,
  ArticleTag,
} from "@/types";

/**
 * Article reads (requirements 1, 2, 7, 8, 14, 15).
 *
 * - Reads always go through `prismaRead` (replica when configured).
 * - Relations are loaded in a constant number of queries (never N+1):
 *   one query for articles + author/category, one query for all tags.
 * - Every read is cached with `unstable_cache` and tagged for on-demand
 *   revalidation.
 * - Lists are cursor-paginated and bounded; we never load the collection.
 */

export const articleInclude = {
  author: {
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
    },
  },
  category: {
    select: { id: true, slug: true, name: true },
  },
} as const;

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  readingTime: number;
  viewCount: number;
  status: "draft" | "in_review" | "published" | "archived";
  publishedAt: Date | null;
  updatedAt: Date;
  author: { id: string; username: string; fullName: string | null; avatarUrl: string | null };
  category: { id: string; slug: string; name: string } | null;
};

function mapArticle(row: ArticleRow): ArticleCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? makeExcerpt(row.content),
    coverImageUrl: row.coverImageUrl,
    readingTime: row.readingTime,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    author: row.author,
    category: row.category,
    tags: [],
  };
}

/** Attach tags to already-fetched articles in ONE extra query (no N+1). */
export async function attachTags(rows: ArticleRow[]): Promise<ArticleCard[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const tagRows = await prismaRead.articleTag.findMany({
    where: { articleId: { in: ids } },
    select: { articleId: true, tag: { select: { slug: true, name: true } } },
    orderBy: { tag: { name: "asc" } },
  });

  const byArticle = new Map<string, ArticleTag[]>();
  for (const tagRow of tagRows) {
    const list = byArticle.get(tagRow.articleId) ?? [];
    list.push({ slug: tagRow.tag.slug, name: tagRow.tag.name });
    byArticle.set(tagRow.articleId, list);
  }

  return rows.map((row) => ({
    ...mapArticle(row),
    tags: byArticle.get(row.id) ?? [],
  }));
}

type ListOptions = {
  limit?: number;
  cursor?: string | null;
  categoryId?: string | null;
  authorId?: string | null;
  tagId?: string | null;
  /** Restrict to a specific status (default: published only). */
  status?: "draft" | "in_review" | "published" | "archived";
};

async function fetchArticleList(options: ListOptions): Promise<ArticleListResult> {
  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, 50);
  const cursor = options.cursor ? decodeCursor(options.cursor) : null;

  const where = {
    status: options.status ?? "published",
    publishedAt: { not: null },
    ...(options.categoryId ? { categoryId: options.categoryId } : {}),
    ...(options.authorId ? { authorId: options.authorId } : {}),
    ...(options.tagId
      ? { tags: { some: { tagId: options.tagId } } }
      : {}),
    ...(cursor
      ? {
          OR: [
            { publishedAt: { lt: new Date(cursor.publishedAt) } },
            {
              publishedAt: new Date(cursor.publishedAt),
              id: { lt: cursor.id },
            },
          ],
        }
      : {}),
  };

  const rows = (await prismaRead.article.findMany({
    where,
    include: articleInclude,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  })) as unknown as ArticleRow[];

  const { items, pageInfo } = buildPageInfo(rows, limit);
  const cards = await attachTags(items);

  return { items: cards, ...pageInfo };
}

/** Cached feed: latest published articles. */
export const getPublishedArticles = unstable_cache(
  (options: ListOptions) => retry(() => fetchArticleList(options)),
  ["articles", "published"],
  {
    revalidate: cacheTimes.feed,
    tags: [cacheTags.articles],
  },
);

/** Cached single article by slug (public, published only). */
export const getPublishedArticleBySlug = unstable_cache(
  async (slug: string) => {
    const row = (await prismaRead.article.findFirst({
      where: { slug, status: "published", publishedAt: { not: null } },
      include: articleInclude,
    })) as unknown as ArticleRow | null;
    if (!row) return null;
    const [card] = await attachTags([row]);
    return card;
  },
  ["article", "by-slug"],
  {
    revalidate: cacheTimes.article,
    tags: [cacheTags.articles],
  },
);

/** Cached full article detail (includes content). */
export const getPublishedArticleDetail = unstable_cache(
  async (slug: string) => {
    const row = (await prismaRead.article.findFirst({
      where: { slug, status: "published", publishedAt: { not: null } },
      include: articleInclude,
    })) as unknown as ArticleRow | null;
    if (!row) return null;
    const [card] = await attachTags([row]);
    return {
      ...card,
      content: row.content,
      viewCount: row.viewCount,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    };
  },
  ["article", "detail"],
  {
    revalidate: cacheTimes.article,
    tags: [cacheTags.articles],
  },
);

/** Cached related articles (same category, excluding the current one). */
export const getRelatedArticles = unstable_cache(
  async (categoryId: string | null, excludeId: string, limit = 4) => {
    const rows = (await prismaRead.article.findMany({
      where: {
        status: "published",
        publishedAt: { not: null },
        id: { not: excludeId },
        ...(categoryId ? { categoryId } : {}),
      },
      include: articleInclude,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: limit,
    })) as unknown as ArticleRow[];
    return attachTags(rows);
  },
  ["articles", "related"],
  { revalidate: cacheTimes.feed, tags: [cacheTags.articles] },
);

/** Cached featured + latest + taxonomies payload for the home page. */
export const getHomeData = unstable_cache(
  async () => {
    const [featured, latest, categories, tags] = await Promise.all([
      prismaRead.article.findFirst({
        where: { status: "published", publishedAt: { not: null } },
        include: articleInclude,
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      }),
      prismaRead.article.findMany({
        where: { status: "published", publishedAt: { not: null } },
        include: articleInclude,
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: 12,
      }),
      prismaRead.category.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { articles: true } } },
      }),
      prismaRead.tag.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { articles: true } } },
      }),
    ]);

    const [featuredCard, latestCards] = await Promise.all([
      featured ? attachTags([featured as unknown as ArticleRow]) : Promise.resolve([]),
      attachTags(latest as unknown as ArticleRow[]),
    ]);

    return {
      featured: featuredCard[0] ?? null,
      latest: latestCards,
      categories: categories.map((category) => ({
        slug: category.slug,
        name: category.name,
        description: category.description,
        articleCount: category._count.articles,
      })),
      tags: tags.map((tag) => ({
        slug: tag.slug,
        name: tag.name,
        articleCount: tag._count.articles,
      })),
    };
  },
  ["home"],
  { revalidate: cacheTimes.feed, tags: [cacheTags.home, cacheTags.articles] },
);

/** Cached article count for a set of filters (used by explore/search UI). */
export const getPublishedCount = unstable_cache(
  async (filter: { categoryId?: string | null; authorId?: string | null } = {}) => {
    return prismaRead.article.count({
      where: {
        status: "published",
        publishedAt: { not: null },
        ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
        ...(filter.authorId ? { authorId: filter.authorId } : {}),
      },
    });
  },
  ["articles", "count"],
  { revalidate: cacheTimes.feed, tags: [cacheTags.articles] },
);

export type { PageInfo };
