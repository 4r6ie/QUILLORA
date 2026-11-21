import Link from "next/link";
import { redirect } from "next/navigation";

import { getMyArticles } from "@/features/dashboard/queries";
import { getCurrentUser } from "@/lib/security/guards";
import { safe } from "@/lib/resilience/errors";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const statusStyles: Record<string, string> = {
  draft: "bg-border text-foreground",
  in_review: "bg-accent/15 text-accent-strong",
  published: "bg-primary text-primary-foreground",
  archived: "bg-muted/10 text-muted",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const result = await safe(() => getMyArticles(user.id), {
    items: [],
    nextCursor: null,
    hasMore: false,
    limit: 12,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Your stories</h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as {user.profile?.fullName ?? user.profile?.username ?? user.email}
          </p>
        </div>
        <Link
          href="/dashboard/articles/new"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          New story
        </Link>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title="No stories yet"
          description="Write your first piece and submit it for review."
          action={
            <Link href="/dashboard/articles/new" className="text-sm font-medium text-accent-strong hover:underline">
              Start writing →
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <ul className="divide-y divide-border">
            {result.items.map((article) => (
              <li key={article.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/articles/${article.id}/edit`}
                    className="font-medium hover:text-accent-strong"
                  >
                    {article.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    /articles/{article.slug} · updated {formatDate(article.publishedAt)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[article.status] ?? "bg-border"}`}
                >
                  {article.status.replace("_", " ")}
                </span>
                <Link
                  href={`/dashboard/articles/${article.id}/edit`}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-surface"
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
