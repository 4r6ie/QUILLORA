import { getAllArticles } from "@/features/admin/queries";
import { safe } from "@/lib/resilience/errors";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const statusStyles: Record<string, string> = {
  draft: "bg-border text-foreground",
  in_review: "bg-amber-500/15 text-amber-700",
  published: "bg-green-600/15 text-green-700",
  archived: "bg-red-500/10 text-red-700",
};

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const status = typeof query.status === "string" ? query.status : undefined;
  const articles = await safe(
    () =>
      getAllArticles({
        status: status as "draft" | "in_review" | "published" | "archived" | undefined,
      }),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-bold">All articles</h1>
        <p className="text-sm text-muted">Moderate, approve, unpublish, or delete.</p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {["", "in_review", "published", "draft", "archived"].map((value) => (
          <a
            key={value || "all"}
            href={value ? `/admin/articles?status=${value}` : "/admin/articles"}
            className={
              (status ?? "") === value
                ? "rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
                : "rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface"
            }
          >
            {value ? value.replace("_", " ") : "all"}
          </a>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <ul className="divide-y divide-border">
          {articles.map((article) => (
            <li key={article.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{article.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  by {article.author.fullName ?? article.author.username} ·{" "}
                  {formatDate(article.updatedAt)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[article.status] ?? "bg-border"}`}
              >
                {article.status.replace("_", " ")}
              </span>
              <ModerationActions articleId={article.id} />
            </li>
          ))}
          {articles.length === 0 ? (
            <li className="p-8 text-center text-sm text-muted">No articles.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
