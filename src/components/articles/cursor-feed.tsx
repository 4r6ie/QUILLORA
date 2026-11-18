"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import type { ArticleListResult } from "@/types";
import { ArticleList } from "@/components/articles/article-list";
import { EmptyState } from "@/components/shared/empty-state";

type FeedFilter = {
  categoryId?: string;
  tagId?: string;
  authorId?: string;
};

function buildQuery(filter: FeedFilter): string {
  const params = new URLSearchParams();
  if (filter.categoryId) params.set("categoryId", filter.categoryId);
  if (filter.tagId) params.set("tagId", filter.tagId);
  if (filter.authorId) params.set("authorId", filter.authorId);
  const string = params.toString();
  return string ? `?${string}` : "";
}

/**
 * Client-side cursor pagination for public feeds.
 *
 * The server page renders the first page (static/ISR). This component reads the
 * cursor from the URL and fetches subsequent pages from /api/articles/feed, so
 * the page itself never has to read `searchParams` (which would de-opt it to
 * dynamic at runtime). Only serializable props are accepted.
 */
export function CursorFeed({
  initial,
  basePath,
  filter,
  emptyText,
}: {
  initial: ArticleListResult;
  basePath: string;
  filter: FeedFilter;
  emptyText: string;
}) {
  const searchParams = useSearchParams();
  const cursor = searchParams.get("cursor");
  const [fetched, setFetched] = useState<ArticleListResult | null>(null);
  const result = cursor ? (fetched ?? initial) : initial;
  const loading = Boolean(cursor) && fetched === null;

  useEffect(() => {
    if (!cursor) return;
    let cancelled = false;
    const apiPath = `/api/articles/feed${buildQuery(filter)}&cursor=${encodeURIComponent(cursor)}`;
    fetch(apiPath, { headers: { accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : initial))
      .then((data: ArticleListResult) => {
        if (!cancelled) setFetched(data);
      })
      .catch(() => {
        if (!cancelled) setFetched(initial);
      });
    return () => {
      cancelled = true;
    };
    // The filter is a stable server prop; re-fetch only when the cursor changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const pageUrl = (nextCursor: string | null) =>
    `${basePath}${nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : ""}`;

  return (
    <div className="space-y-6">
      {result.items.length === 0 ? (
        <EmptyState title={emptyText} />
      ) : (
        <ArticleList articles={result.items} />
      )}

      {loading ? <p className="text-sm text-muted">Loading…</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        {cursor ? (
          <Link
            href={pageUrl(null)}
            className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-surface"
          >
            ← Reset
          </Link>
        ) : null}
        {result.hasMore && result.nextCursor ? (
          <Link
            href={pageUrl(result.nextCursor)}
            className="rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-surface"
          >
            Next →
          </Link>
        ) : cursor ? (
          <span className="text-sm text-muted">End of results</span>
        ) : null}
      </div>
    </div>
  );
}
