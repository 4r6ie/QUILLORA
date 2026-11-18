"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import type { CommentListResult } from "@/types";
import { CommentList } from "@/components/comments/comment-section";

/**
 * Client-side comment pagination. Reads the `comments` cursor from the URL and
 * fetches from /api/comments so the article page stays static/ISR.
 */
export function CommentPager({
  articleId,
  slug,
  initial,
}: {
  articleId: string;
  slug: string;
  initial: CommentListResult;
}) {
  const searchParams = useSearchParams();
  const cursor = searchParams.get("comments");
  const [fetched, setFetched] = useState<CommentListResult | null>(null);
  const result = cursor ? (fetched ?? initial) : initial;
  const loading = Boolean(cursor) && fetched === null;

  useEffect(() => {
    if (!cursor) return;
    let cancelled = false;
    fetch(
      `/api/comments?articleId=${encodeURIComponent(articleId)}&cursor=${encodeURIComponent(cursor)}`,
      { headers: { accept: "application/json" } },
    )
      .then((response) => (response.ok ? response.json() : initial))
      .then((data: CommentListResult) => {
        if (!cancelled) setFetched(data);
      })
      .catch(() => {
        if (!cancelled) setFetched(initial);
      });
    return () => {
      cancelled = true;
    };
  }, [cursor, articleId, initial]);

  return (
    <div className="space-y-4">
      <CommentList comments={result.items} />
      {loading ? <p className="text-sm text-muted">Loading…</p> : null}
      {result.hasMore && result.nextCursor ? (
        <Link
          href={`/articles/${slug}?comments=${encodeURIComponent(result.nextCursor ?? "")}`}
          className="inline-block rounded-full border border-border px-5 py-2 text-sm font-medium hover:bg-surface"
        >
          More comments →
        </Link>
      ) : null}
    </div>
  );
}
