import { getAdminStats, getReviewQueue } from "@/features/admin/queries";
import { safe } from "@/lib/resilience/errors";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AdminPage() {
  const stats = await safe(() => getAdminStats(), null);
  const queue = await safe(() => getReviewQueue(), {
    items: [],
    nextCursor: null,
    hasMore: false,
    limit: 20,
  });

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-bold">Overview</h1>
        <p className="text-sm text-muted">Platform health at a glance.</p>
      </div>

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Published", value: stats.published, tone: "text-green-700" },
            { label: "In review", value: stats.inReview, tone: "text-amber-700" },
            { label: "Drafts", value: stats.drafts, tone: "text-muted" },
            { label: "Archived", value: stats.archived, tone: "text-red-700" },
            { label: "Authors", value: stats.authors, tone: "text-foreground" },
            { label: "Comments", value: stats.comments, tone: "text-foreground" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-sm text-muted">{card.label}</p>
              <p className={`mt-1 font-serif text-3xl font-bold ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Statistics are temporarily unavailable.</p>
      )}

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-bold">Review queue</h2>
        {queue.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
            Nothing waiting for review. 🎉
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <ul className="divide-y divide-border">
              {queue.items.map((article) => (
                <li key={article.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{article.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      by {article.author.fullName ?? article.author.username} ·{" "}
                      {formatDate(article.updatedAt)}
                    </p>
                  </div>
                  <ModerationActions articleId={article.id} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
