import "server-only";

import { unstable_cache } from "next/cache";

import { cacheTags, cacheTimes } from "@/lib/cache/keys";
import { prismaRead } from "@/lib/db/read";
import { prisma } from "@/lib/db/client";
import type { CategoryWithCount } from "@/types";

/** Cached category list with published-article counts. */
export const getCategories = unstable_cache(
  async (): Promise<CategoryWithCount[]> => {
    const rows = await prismaRead.category.findMany({
      orderBy: { name: "asc" },
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

    return rows.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      articleCount: category._count.articles,
    }));
  },
  ["categories"],
  { revalidate: cacheTimes.taxonomy, tags: [cacheTags.categories] },
);

/** Cached single category by slug. */
export const getCategoryBySlug = unstable_cache(
  async (slug: string) => {
    const category = await prismaRead.category.findUnique({
      where: { slug },
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
    if (!category) return null;
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      articleCount: category._count.articles,
    };
  },
  ["category", "by-slug"],
  { revalidate: cacheTimes.taxonomy, tags: [cacheTags.categories] },
);

/** Write helper used by admin/seed flows. */
export async function createCategory(input: {
  slug: string;
  name: string;
  description?: string | null;
}) {
  const category = await prisma.category.create({
    data: {
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
    },
  });
  return category;
}
