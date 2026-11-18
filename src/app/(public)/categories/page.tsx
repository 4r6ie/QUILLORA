import Link from "next/link";

import { getCategories } from "@/features/categories/queries";
import { safe } from "@/lib/resilience/errors";
import { EmptyState } from "@/components/shared/empty-state";

export const revalidate = 600;

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await safe(() => getCategories(), []);

  return (
    <div className="container-page py-12">
      <div className="mb-8 space-y-2">
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
          Categories
        </h1>
        <p className="text-muted">Browse stories by subject.</p>
      </div>

      {categories.length === 0 ? (
        <EmptyState title="No categories yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent-strong"
            >
              <h2 className="font-serif text-xl font-semibold">{category.name}</h2>
              {category.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted">
                  {category.description}
                </p>
              ) : null}
              <p className="mt-3 text-xs font-medium text-muted">
                {category.articleCount} published{" "}
                {category.articleCount === 1 ? "story" : "stories"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
