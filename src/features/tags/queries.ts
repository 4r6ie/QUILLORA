import "server-only";

import { unstable_cache } from "next/cache";

import { cacheTags, cacheTimes } from "@/lib/cache/keys";
import { prismaRead } from "@/lib/db/read";
import { prisma } from "@/lib/db/client";
import type { TagWithCount } from "@/types";

/**
 * Cached tag list with published-article counts.
 *
 * Counts come from a single `groupBy` on the join table (one extra query for
 * the whole list, not per tag), filtered to published articles.
 */
async function publishedCountsByTag(): Promise<Map<string, number>> {
  const rows = await prismaRead.articleTag.groupBy({
    by: ["tagId"],
    where: {
      article: { status: "published", publishedAt: { not: null } },
    },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.tagId, row._count._all]));
}

export const getTags = unstable_cache(
  async (): Promise<TagWithCount[]> => {
    const [tags, counts] = await Promise.all([
      prismaRead.tag.findMany({ orderBy: { name: "asc" } }),
      publishedCountsByTag(),
    ]);

    return tags.map((tag) => ({
      id: tag.id,
      slug: tag.slug,
      name: tag.name,
      articleCount: counts.get(tag.id) ?? 0,
    }));
  },
  ["tags"],
  { revalidate: cacheTimes.taxonomy, tags: [cacheTags.tags] },
);

/** Cached single tag by slug. */
export const getTagBySlug = unstable_cache(
  async (slug: string) => {
    const [tag, counts] = await Promise.all([
      prismaRead.tag.findUnique({ where: { slug } }),
      publishedCountsByTag(),
    ]);
    if (!tag) return null;
    return {
      id: tag.id,
      slug: tag.slug,
      name: tag.name,
      articleCount: counts.get(tag.id) ?? 0,
    };
  },
  ["tag", "by-slug"],
  { revalidate: cacheTimes.taxonomy, tags: [cacheTags.tags] },
);

/** Write helper used by admin/seed flows. */
export async function createTag(input: { slug: string; name: string }) {
  return prisma.tag.create({
    data: { slug: input.slug, name: input.name },
  });
}
