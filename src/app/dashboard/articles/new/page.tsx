import { redirect } from "next/navigation";

import { getCategories } from "@/features/categories/queries";
import { getCurrentUser } from "@/lib/security/guards";
import { safe } from "@/lib/resilience/errors";
import { ArticleEditor } from "@/components/dashboard/article-editor";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function NewArticlePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const categories = await safe(() => getCategories(), []);
  const canPublish = user.profile?.role === "editor" || user.profile?.role === "admin";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-bold">New story</h1>
        <p className="text-sm text-muted">
          Draft now, submit for review when it is ready.
        </p>
      </div>
      <ArticleEditor
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        canPublish={canPublish}
      />
    </div>
  );
}
