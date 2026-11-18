import type { ArticleCard as ArticleCardData } from "@/types";
import { ArticleCard } from "@/components/articles/article-card";

export function ArticleList({ articles }: { articles: ArticleCardData[] }) {
  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">
        No articles here yet.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
