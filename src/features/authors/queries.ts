import "server-only";

import { unstable_cache } from "next/cache";

import { cacheTags, cacheTimes } from "@/lib/cache/keys";
import { prismaRead } from "@/lib/db/read";
import { getPublishedArticles } from "@/features/articles/queries";
import type { ArticleListResult, AuthorProfile } from "@/types";

/** Cached public author profile with published-article count. */
export const getAuthorByUsername = unstable_cache(
  async (username: string): Promise<AuthorProfile | null> => {
    const profile = await prismaRead.profile.findUnique({
      where: { username },
      include: {
        _count: {
          select: {
            articles: {
              where: { status: "published", publishedAt: { not: null } },
            },
          },
        },
      },
    });
    if (!profile) return null;

    return {
      id: profile.id,
      username: profile.username,
      fullName: profile.fullName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      role: profile.role,
      articleCount: profile._count.articles,
    };
  },
  ["author", "by-username"],
  { revalidate: cacheTimes.taxonomy, tags: [cacheTags.authors] },
);

/** Cached list of authors that have published at least one article. */
export const getAuthors = unstable_cache(
  async (): Promise<AuthorProfile[]> => {
    const profiles = await prismaRead.profile.findMany({
      where: {
        role: { in: ["author", "editor", "admin"] },
        articles: { some: { status: "published", publishedAt: { not: null } } },
      },
      orderBy: { username: "asc" },
      include: {
        _count: {
          select: {
            articles: {
              where: { status: "published", publishedAt: { not: null } },
            },
          },
        },
      },
    });

    return profiles.map((profile) => ({
      id: profile.id,
      username: profile.username,
      fullName: profile.fullName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      role: profile.role,
      articleCount: profile._count.articles,
    }));
  },
  ["authors"],
  { revalidate: cacheTimes.taxonomy, tags: [cacheTags.authors] },
);

/** Cached, paginated published articles for an author. */
export async function getAuthorArticles(
  username: string,
  options: { limit?: number; cursor?: string | null } = {},
): Promise<ArticleListResult> {
  const author = await getAuthorByUsername(username);
  if (!author) {
    return { items: [], nextCursor: null, hasMore: false, limit: options.limit ?? 12 };
  }
  return getPublishedArticles({
    limit: options.limit,
    cursor: options.cursor,
    authorId: author.id,
  });
}
