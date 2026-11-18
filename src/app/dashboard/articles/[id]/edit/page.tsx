import { notFound, redirect } from "next/navigation";

import { getArticleForEditing } from "@/features/dashboard/queries";
import { getCategories } from "@/features/categories/queries";
import { canEditArticle, getCurrentUser } from "@/lib/security/guards";
import { safe } from "@/lib/resilience/errors";
import { ArticleEditor } from "@/components/dashboard/article-editor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const article = await safe(() => getArticleForEditing(id), null);
  if (!article) notFound();
  if (!canEditArticle(user, article)) redirect("/dashboard");

  const categories = await safe(() => getCategories(), []);
  const canPublish = user.profile?.role === "editor" || user.profile?.role === "admin";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-bold">Edit story</h1>
        <p className="text-sm text-muted">/{article.slug}</p>
      </div>
      <ArticleEditor
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        canPublish={canPublish}
        initial={{
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt ?? "",
          content: article.content,
          coverImageUrl: article.coverImageUrl ?? "",
          categoryId: article.categoryId,
          tags: article.tags.map((tag) => ({ slug: tag.tag.slug, name: tag.tag.name })),
          status: article.status,
        }}
      />
    </div>
  );
}
