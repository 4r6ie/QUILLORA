import Link from "next/link";

import { getHomeData } from "@/features/articles/queries";
import { safe } from "@/lib/resilience/errors";
import { ArticleList } from "@/components/articles/article-list";
import { EmptyState } from "@/components/shared/empty-state";
import { TagPill } from "@/components/articles/article-card";
import { envPublic } from "@/lib/env-public";

/**
 * Home page — public, cached (requirement 1, 2).
 * `revalidate` gives ISR; the underlying data is cached with tags and
 * revalidated on demand when articles change.
 */
export const revalidate = 300;

export default async function HomePage() {
  const data = await safe(() => getHomeData(), null);

  if (!data) {
    return (
      <div className="container-page py-16">
        <EmptyState
          title="We're warming up"
          description="The publishing feed is temporarily unavailable. Please try again in a moment."
        />
      </div>
    );
  }

  const { featured, latest, categories, tags } = data;

  return (
    <div className="container-page space-y-16 py-12">
      {/* Hero */}
      <section className="space-y-6">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Independent publishing
          </p>
          <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Stories that earn your attention.
          </h1>
          <p className="text-lg text-muted">
            Essays, reporting, and ideas from independent writers — curated by a
            real editorial team.
          </p>
        </div>

        {featured ? (
          <Link
            href={`/articles/${featured.slug}`}
            className="group grid gap-6 rounded-3xl border border-border bg-surface p-6 transition-shadow hover:shadow-sm md:grid-cols-2 md:p-10"
          >
            <div className="space-y-4">
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
                Featured
              </span>
              <h2 className="font-serif text-3xl font-bold leading-tight group-hover:text-accent">
                {featured.title}
              </h2>
              <p className="line-clamp-3 text-muted">{featured.excerpt}</p>
              <span className="text-sm font-medium">
                {featured.author.fullName ?? featured.author.username}
              </span>
            </div>
            <div className="hidden items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 md:flex">
              <span className="font-serif text-6xl text-accent/40">✦</span>
            </div>
          </Link>
        ) : null}
      </section>

      {/* Latest */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-serif text-2xl font-bold">Latest stories</h2>
          <Link href="/explore" className="text-sm font-medium text-accent hover:underline">
            Browse everything →
          </Link>
        </div>
        <ArticleList articles={latest} />
      </section>

      {/* Taxonomies */}
      <section className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-serif text-2xl font-bold">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent"
              >
                {category.name}
                <span className="ml-1.5 text-xs text-muted">{category.articleCount}</span>
              </Link>
            ))}
            {categories.length === 0 ? (
              <p className="text-sm text-muted">No categories yet.</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="font-serif text-2xl font-bold">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 20).map((tag) => (
              <TagPill key={tag.slug} slug={tag.slug} name={tag.name} />
            ))}
            {tags.length === 0 ? <p className="text-sm text-muted">No tags yet.</p> : null}
          </div>
        </div>
      </section>

      {/* About CTA */}
      <section className="rounded-3xl border border-border bg-surface p-8 md:p-12">
        <div className="max-w-2xl space-y-3">
          <h2 className="font-serif text-3xl font-bold">Publish with {envPublic.NEXT_PUBLIC_APP_NAME}</h2>
          <p className="text-muted">
            Join a platform built for writers: fast pages, real editorial
            workflow, and infrastructure that scales with your audience.
          </p>
          <Link
            href="/register"
            className="inline-flex rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            Start writing
          </Link>
        </div>
      </section>
    </div>
  );
}
