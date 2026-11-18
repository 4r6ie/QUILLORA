import Link from "next/link";

import { getAuthors } from "@/features/authors/queries";
import { safe } from "@/lib/resilience/errors";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar } from "@/components/shared/avatar";

export const revalidate = 600;

export const metadata = { title: "Authors" };

export default async function AuthorsPage() {
  const authors = await safe(() => getAuthors(), []);

  return (
    <div className="container-page py-12">
      <div className="mb-8 space-y-2">
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Authors
        </h1>
        <p className="text-muted">The writers behind the platform.</p>
      </div>

      {authors.length === 0 ? (
        <EmptyState
          title="No authors yet"
          description="Be the first to publish."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((author) => (
            <Link
              key={author.username}
              href={`/authors/${author.username}`}
              className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent-strong"
            >
              <Avatar name={author.fullName ?? author.username} size={48} />
              <div className="min-w-0">
                <h2 className="font-semibold">
                  {author.fullName ?? author.username}
                </h2>
                {author.bio ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{author.bio}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted">
                  {author.articleCount} published{" "}
                  {author.articleCount === 1 ? "story" : "stories"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
