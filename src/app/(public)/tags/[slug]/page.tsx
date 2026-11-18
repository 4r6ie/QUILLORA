import { notFound } from "next/navigation";

import { getTagBySlug } from "@/features/tags/queries";
import { getPublishedArticles } from "@/features/articles/queries";
import { safe } from "@/lib/resilience/errors";
import { FeedSection } from "@/components/articles/feed";

/**
 * Public tag feed. ISR (5 min), client-side pagination.
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
  const tag = await safe(() => getTagBySlug(slug), null);
  return { title: tag?.name ?? "Tag" };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tag = await safe(() => getTagBySlug(slug), null);
  if (!tag) notFound();

  const initial = await safe(
    () => getPublishedArticles({ tagId: tag.id }),
    { items: [], nextCursor: null, hasMore: false, limit: 12 },
  );

  return (
    <div className="container-page py-12">
      <FeedSection
        title={`#${tag.name}`}
        description={`${tag.articleCount} published ${tag.articleCount === 1 ? "story" : "stories"}`}
        initial={initial}
        basePath={`/tags/${slug}`}
        filter={{ tagId: tag.id }}
        emptyText="No published stories with this tag yet."
      />
    </div>
  );
}
