import Link from "next/link";

import { getTags } from "@/features/tags/queries";
import { safe } from "@/lib/resilience/errors";
import { EmptyState } from "@/components/shared/empty-state";

export const revalidate = 600;

export const metadata = { title: "Tags" };

export default async function TagsPage() {
  const tags = await safe(() => getTags(), []);

  return (
    <div className="container-page py-12">
      <div className="mb-8 space-y-2">
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Tags
        </h1>
        <p className="text-muted">Every topic covered on the platform.</p>
      </div>

      {tags.length === 0 ? (
        <EmptyState title="No tags yet" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag.slug}
              href={`/tags/${tag.slug}`}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm transition-colors hover:border-accent-strong hover:text-accent-strong"
            >
              #{tag.name}
              <span className="ml-1.5 text-xs text-muted">{tag.articleCount}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
