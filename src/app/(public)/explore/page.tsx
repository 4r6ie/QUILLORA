import Link from "next/link";

import { getCategories } from "@/features/categories/queries";
import { getTags } from "@/features/tags/queries";
import { getPublishedArticles } from "@/features/articles/queries";
import { searchArticles } from "@/features/search/queries";
import { safe } from "@/lib/resilience/errors";
import { ArticleList } from "@/components/articles/article-list";
import {
  CursorPagination,
  PagePagination,
} from "@/components/shared/pagination-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchBox } from "@/components/layout/search-box";

/**
 * Explore / search. Search is page-bounded and the underlying query is cached
 * for 30 seconds. The API surface is rate limited (requirement 10).
 */
export const dynamic = "force-dynamic";

const EMPTY_FEED = { items: [], nextCursor: null, hasMore: false, limit: 12 };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q : "";
  const categorySlug = typeof query.category === "string" ? query.category : null;
  const tagSlug = typeof query.tag === "string" ? query.tag : null;
  const page = Number(query.page ?? 1) || 1;
  const cursor = typeof query.cursor === "string" ? query.cursor : null;

  const [categories, tags] = await Promise.all([
    safe(() => getCategories(), []),
    safe(() => getTags(), []),
  ]);

  const activeCategory = categorySlug
    ? categories.find((category) => category.slug === categorySlug) ?? null
    : null;
  const activeTag = tagSlug
    ? tags.find((tag) => tag.slug === tagSlug) ?? null
    : null;

  const buildHref = (
    overrides: Record<string, string | number | null | undefined>,
  ) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = {
      q: q || undefined,
      category: categorySlug ?? undefined,
      tag: tagSlug ?? undefined,
      cursor: cursor ?? undefined,
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    const string = params.toString();
    return string ? `/explore?${string}` : "/explore";
  };

  const searching = q.trim().length > 0;

  const searchResult = searching
    ? await safe(() => searchArticles(q, page), {
        items: [],
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
        query: q,
      })
    : null;

  const feed = searching
    ? null
    : await safe(
        () =>
          getPublishedArticles({
            cursor,
            categoryId: activeCategory?.id ?? null,
            tagId: activeTag?.id ?? null,
          }),
        EMPTY_FEED,
      );

  return (
    <div className="container-page space-y-8 py-12">
      <div className="space-y-3">
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Explore
        </h1>
        <p className="text-muted">
          Search every published story, or filter by category and tag.
        </p>
        <div className="max-w-md">
          <SearchBox />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/explore"
            className={
              !activeCategory
                ? "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
                : "rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface"
            }
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={buildHref({ category: category.slug, tag: undefined })}
              className={
                activeCategory?.slug === category.slug
                  ? "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
                  : "rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface"
              }
            >
              {category.name}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 30).map((tag) => (
            <Link
              key={tag.slug}
              href={buildHref({ tag: tag.slug, category: undefined })}
              className={
                activeTag?.slug === tag.slug
                  ? "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
                  : "rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface"
              }
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      </div>

      {searching && searchResult ? (
        <section className="space-y-6">
          <p className="text-sm text-muted">
            {searchResult.total} result{searchResult.total === 1 ? "" : "s"} for
            &ldquo;{searchResult.query}&rdquo;
          </p>
          {searchResult.items.length === 0 ? (
            <EmptyState
              title="No matches"
              description="Try a different keyword or clear the filters."
            />
          ) : (
            <>
              <ArticleList articles={searchResult.items} />
              <PagePagination
                page={searchResult.page}
                totalPages={searchResult.totalPages}
                makeHref={(nextPage) => buildHref({ page: nextPage })}
              />
            </>
          )}
        </section>
      ) : null}

      {!searching && feed ? (
        <section className="space-y-6">
          {feed.items.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              description="Try clearing the filters or check back soon."
            />
          ) : (
            <>
              <ArticleList articles={feed.items} />
              <CursorPagination
                nextCursor={feed.nextCursor}
                hasMore={feed.hasMore}
                makeHref={(nextCursor) => buildHref({ cursor: nextCursor })}
              />
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
