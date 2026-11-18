import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublishedArticleDetail } from "@/features/articles/queries";
import { getRelatedArticles } from "@/features/articles/queries";
import { getArticleComments } from "@/features/comments/queries";
import { safe } from "@/lib/resilience/errors";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/shared/avatar";
import { SupabaseImage } from "@/components/shared/supabase-image";
import { TagPill } from "@/components/articles/article-card";
import { ArticleList } from "@/components/articles/article-list";
import { ArticleViewRecorder } from "@/components/articles/view-recorder";
import { CommentForm } from "@/components/comments/comment-section";
import { CommentPager } from "@/components/comments/comment-pager";

/**
 * Public article page (requirements 1, 2, 3, 7, 8).
 * ISR-cached for 5 minutes, data cached + tagged, revalidated on write.
 * The page does not read `searchParams`; comment pagination is client-side.
 */
export const revalidate = 300;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  // Empty on purpose: pages render on demand and cache with ISR, so a build
  // never needs a database connection.
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await safe(() => getPublishedArticleDetail(slug), null);
  if (!article) return { title: "Article not found" };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt ?? undefined,
      authors: [article.author.fullName ?? article.author.username],
      images: article.coverImageUrl ? [article.coverImageUrl] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await safe(() => getPublishedArticleDetail(slug), null);
  if (!article) notFound();

  const [comments, related] = await Promise.all([
    safe(() => getArticleComments(article.id), {
      items: [],
      nextCursor: null,
      hasMore: false,
      limit: 12,
    }),
    safe(() => getRelatedArticles(article.category?.id ?? null, article.id), []),
  ]);

  return (
    <article className="container-page space-y-12 py-10">
      <ArticleViewRecorder articleId={article.id} />

      <header className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {article.category ? (
            <Link
              href={`/categories/${article.category.slug}`}
              className="font-semibold uppercase tracking-wide text-accent-strong hover:underline"
            >
              {article.category.name}
            </Link>
          ) : null}
          <span aria-hidden>·</span>
          <time dateTime={article.publishedAt ?? undefined}>
            {formatDate(article.publishedAt)}
          </time>
          <span aria-hidden>·</span>
          <span>{article.readingTime} min read</span>
        </div>

        <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          {article.title}
        </h1>

        <p className="text-xl leading-relaxed text-muted">{article.excerpt}</p>

        <div className="flex items-center gap-3 border-y border-border py-4">
          <Avatar
            name={article.author.fullName ?? article.author.username}
            size={44}
          />
          <div>
            <Link
              href={`/authors/${article.author.username}`}
              className="font-medium hover:text-accent-strong"
            >
              {article.author.fullName ?? article.author.username}
            </Link>
            <p className="text-sm text-muted">Published author</p>
          </div>
        </div>
      </header>

      {article.coverImageUrl ? (
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border">
          <SupabaseImage
            src={article.coverImageUrl}
            alt={article.title}
            width={1600}
            height={900}
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="h-auto w-full object-cover"
          />
        </div>
      ) : null}

      <div
        className="article-content mx-auto max-w-3xl"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {article.tags.length > 0 ? (
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
          {article.tags.map((tag) => (
            <TagPill key={tag.slug} slug={tag.slug} name={tag.name} />
          ))}
        </div>
      ) : null}

      {/* Comments */}
      <section className="mx-auto max-w-3xl space-y-6 border-t border-border pt-10">
        <h2 className="font-serif text-2xl font-bold">
          Discussion ({comments.items.length})
        </h2>
        <CommentForm articleId={article.id} />
        <Suspense
          fallback={
            <p className="text-sm text-muted">Loading comments…</p>
          }
        >
          <CommentPager articleId={article.id} slug={article.slug} initial={comments} />
        </Suspense>
      </section>

      {/* Related */}
      {related.length > 0 ? (
        <section className="space-y-6 border-t border-border pt-12">
          <h2 className="font-serif text-2xl font-bold">Related stories</h2>
          <ArticleList articles={related} />
        </section>
      ) : null}
    </article>
  );
}
