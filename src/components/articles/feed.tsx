import { Suspense } from "react";

import type { ArticleListResult } from "@/types";
import { CursorFeed } from "@/components/articles/cursor-feed";

/**
 * Public feed with the first page rendered statically (ISR) and subsequent
 * pages fetched client-side. The page itself never reads `searchParams`, which
 * keeps it static; the client component reads the cursor from the URL.
 */
export function FeedSection({
  title,
  description,
  initial,
  basePath,
  filter,
  emptyText = "Nothing here yet.",
}: {
  title: string;
  description?: string;
  initial: ArticleListResult;
  basePath: string;
  filter: { categoryId?: string; tagId?: string; authorId?: string };
  emptyText?: string;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description ? <p className="text-muted">{description}</p> : null}
      </div>

      <Suspense
        fallback={
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">
            Loading stories…
          </div>
        }
      >
        <CursorFeed
          initial={initial}
          basePath={basePath}
          filter={filter}
          emptyText={emptyText}
        />
      </Suspense>
    </section>
  );
}
