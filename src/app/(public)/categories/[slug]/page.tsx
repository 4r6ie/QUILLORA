import { notFound } from "next/navigation";

import { getCategoryBySlug } from "@/features/categories/queries";
import { getPublishedArticles } from "@/features/articles/queries";
import { safe } from "@/lib/resilience/errors";
import { FeedSection } from "@/components/articles/feed";

/**
 * Public category feed. ISR (5 min) with the first page rendered statically;
 * pagination is client-side via /api/articles/feed.
 */
export const revalidate = 300;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await safe(() => getCategoryBySlug(slug), null);
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const category = await safe(() => getCategoryBySlug(slug), null);
  if (!category) notFound();

  const initial = await safe(
    () => getPublishedArticles({ categoryId: category.id }),
    { items: [], nextCursor: null, hasMore: false, limit: 12 },
  );

  return (
    <div className="container-page py-12">
      <FeedSection
        title={category.name}
        description={category.description ?? undefined}
        initial={initial}
        basePath={`/categories/${slug}`}
        filter={{ categoryId: category.id }}
        emptyText="No published stories in this category yet."
      />
    </div>
  );
}
