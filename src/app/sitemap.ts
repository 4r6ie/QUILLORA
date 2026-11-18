import type { MetadataRoute } from "next";

import { prismaRead } from "@/lib/db/read";
import { envPublic } from "@/lib/env-public";
import { safe } from "@/lib/resilience/errors";

/** Sitemap (requirement 8: never load unbounded collections). */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = envPublic.NEXT_PUBLIC_SITE_URL;
  const entries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/explore`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/categories`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/tags`, changeFrequency: "daily", priority: 0.5 },
    { url: `${base}/authors`, changeFrequency: "daily", priority: 0.5 },
  ];

  const articles = await safe(
    () =>
      prismaRead.article.findMany({
        where: { status: "published", publishedAt: { not: null } },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      }),
    [] as { slug: string; updatedAt: Date }[],
  );

  for (const article of articles) {
    entries.push({
      url: `${base}/articles/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
