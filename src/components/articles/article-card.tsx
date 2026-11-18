import Link from "next/link";

import type { ArticleCard as ArticleCardData } from "@/types";
import { formatDate } from "@/lib/utils";
import { Avatar } from "@/components/shared/avatar";
import { SupabaseImage } from "@/components/shared/supabase-image";

export function TagPill({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      href={`/tags/${slug}`}
      className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted transition-colors hover:border-accent-strong hover:text-accent-strong"
    >
      {name}
    </Link>
  );
}

export function ArticleCard({ article }: { article: ArticleCardData }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-shadow hover:shadow-sm">
      {article.coverImageUrl ? (
        <Link href={`/articles/${article.slug}`} className="block aspect-[16/9] overflow-hidden bg-border">
          <SupabaseImage
            src={article.coverImageUrl}
            alt={article.title}
            width={800}
            height={450}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>
      ) : (
        <Link
          href={`/articles/${article.slug}`}
          className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-accent/20 to-accent/5"
        >
          <span aria-hidden className="font-serif text-2xl text-accent/40">✦</span>
        </Link>
      )}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-xs text-muted">
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

        <h3 className="font-serif text-xl font-semibold leading-snug">
          <Link href={`/articles/${article.slug}`} className="hover:text-accent-strong">
            {article.title}
          </Link>
        </h3>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted">
          {article.excerpt}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Avatar name={article.author.fullName ?? article.author.username} size={28} />
          <Link
            href={`/authors/${article.author.username}`}
            className="text-sm font-medium hover:text-accent-strong"
          >
            {article.author.fullName ?? article.author.username}
          </Link>
        </div>

        {article.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {article.tags.slice(0, 3).map((tag) => (
              <TagPill key={tag.slug} slug={tag.slug} name={tag.name} />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
