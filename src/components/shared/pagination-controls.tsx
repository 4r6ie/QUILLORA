import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Cursor pagination controls (requirement 8). Rendered as plain links so it
 * works without client JavaScript.
 */
export function CursorPagination({
  nextCursor,
  hasMore,
  makeHref,
  className,
}: {
  nextCursor: string | null;
  hasMore: boolean;
  makeHref: (cursor: string | null) => string;
  className?: string;
}) {
  const makeHrefRef = makeHref;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-3", className)}
    >
      <span />
      {hasMore && nextCursor ? (
        <Link
          href={makeHrefRef(nextCursor)}
          className="rounded-full border border-border px-5 py-2 text-sm font-medium transition-colors hover:bg-surface"
        >
          Next →
        </Link>
      ) : (
        <span className="text-sm text-muted">End of results</span>
      )}
    </nav>
  );
}

/** Numbered pagination for page-based lists (search). */
export function PagePagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const window = 2;
  const pages = new Set<number>([1, totalPages]);
  for (let p = page - window; p <= page + window; p += 1) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-1.5">
      {page > 1 ? (
        <Link
          href={makeHref(page - 1)}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
        >
          ← Prev
        </Link>
      ) : null}
      {sorted.map((p, index) => {
        const previous = sorted[index - 1];
        const gap = previous !== undefined && p - previous > 1;
        return (
          <span key={p} className="flex items-center gap-1.5">
            {gap ? <span className="text-muted">…</span> : null}
            <Link
              href={makeHref(p)}
              aria-current={p === page ? "page" : undefined}
              className={
                p === page
                  ? "rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
                  : "rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
              }
            >
              {p}
            </Link>
          </span>
        );
      })}
      {page < totalPages ? (
        <Link
          href={makeHref(page + 1)}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
        >
          Next →
        </Link>
      ) : null}
    </nav>
  );
}
