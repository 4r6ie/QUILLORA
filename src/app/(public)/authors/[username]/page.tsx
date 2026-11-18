import { notFound } from "next/navigation";

import { getAuthorByUsername, getAuthorArticles } from "@/features/authors/queries";
import { safe } from "@/lib/resilience/errors";
import { FeedSection } from "@/components/articles/feed";
import { Avatar } from "@/components/shared/avatar";

/**
 * Public author profile. ISR (5 min), client-side pagination.
 */
export const revalidate = 300;

export async function generateStaticParams(): Promise<{ username: string }[]> {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const author = await safe(() => getAuthorByUsername(username), null);
  return { title: author ? author.fullName ?? author.username : "Author" };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const author = await safe(() => getAuthorByUsername(username), null);
  if (!author) notFound();

  const initial = await safe(
    () => getAuthorArticles(username, {}),
    { items: [], nextCursor: null, hasMore: false, limit: 12 },
  );

  return (
    <div className="container-page py-12">
      <header className="mb-10 flex items-center gap-4 rounded-3xl border border-border bg-surface p-6">
        <Avatar name={author.fullName ?? author.username} size={64} />
        <div>
          <h1 className="font-serif text-3xl font-bold">
            {author.fullName ?? author.username}
          </h1>
          {author.bio ? <p className="mt-1 text-muted">{author.bio}</p> : null}
          <p className="mt-2 text-sm text-muted">
            {author.articleCount} published{" "}
            {author.articleCount === 1 ? "story" : "stories"}
          </p>
        </div>
      </header>

      <FeedSection
        title="Published stories"
        initial={initial}
        basePath={`/authors/${username}`}
        filter={{ authorId: author.id }}
        emptyText="This author has not published yet."
      />
    </div>
  );
}
