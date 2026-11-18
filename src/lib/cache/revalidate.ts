import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

import { cacheTags } from "@/lib/cache/keys";

/**
 * On-demand revalidation (requirement 3).
 *
 * Called from server actions (article approved / updated / unpublished /
 * deleted, comment created, profile changed) and from POST /api/revalidate so
 * Supabase webhooks or Realtime can trigger the same invalidation.
 *
 * Both tag-level (granular data cache) and path-level (HTML/RSC cache) are
 * invalidated so CDN caches and the full page cache stay consistent.
 *
 * Next 16 requires the cache-life profile as the second argument. `"max"`
 * gives stale-while-revalidate semantics: the cached entry is refreshed in the
 * background while the stale response is served, so a revalidation never
 * blocks a reader.
 */
const PROFILE = "max";

export function revalidateArticle(slug: string) {
  revalidateTag(cacheTags.article(slug), PROFILE);
  revalidateTag(cacheTags.articles, PROFILE);
  revalidateTag(cacheTags.home, PROFILE);
  revalidatePath("/");
  revalidatePath(`/articles/${slug}`);
  revalidatePath("/explore");
  revalidatePath("/sitemap.xml");
}

export function revalidateCategory(slug: string) {
  revalidateTag(cacheTags.category(slug), PROFILE);
  revalidateTag(cacheTags.categories, PROFILE);
  revalidateTag(cacheTags.articles, PROFILE);
  revalidatePath(`/categories/${slug}`);
  revalidatePath("/explore");
  revalidatePath("/categories");
}

export function revalidateTagEntity(slug: string) {
  revalidateTag(cacheTags.tag(slug), PROFILE);
  revalidateTag(cacheTags.tags, PROFILE);
  revalidateTag(cacheTags.articles, PROFILE);
  revalidatePath(`/tags/${slug}`);
  revalidatePath("/explore");
  revalidatePath("/tags");
}

export function revalidateAuthor(username: string) {
  revalidateTag(cacheTags.author(username), PROFILE);
  revalidateTag(cacheTags.authors, PROFILE);
  revalidatePath(`/authors/${username}`);
  revalidatePath("/authors");
}

export function revalidateComments(articleSlug: string) {
  revalidateTag(cacheTags.article(articleSlug), PROFILE);
  revalidatePath(`/articles/${articleSlug}`);
}

export function revalidateAllPublic() {
  revalidateTag(cacheTags.articles, PROFILE);
  revalidateTag(cacheTags.categories, PROFILE);
  revalidateTag(cacheTags.tags, PROFILE);
  revalidateTag(cacheTags.authors, PROFILE);
  revalidateTag(cacheTags.home, PROFILE);
  revalidateTag(cacheTags.search, PROFILE);
  revalidatePath("/", "layout");
}

export type RevalidateRequest =
  | { type: "article"; slug: string }
  | { type: "category"; slug: string }
  | { type: "tag"; slug: string }
  | { type: "author"; username: string }
  | { type: "article-comments"; slug: string }
  | { type: "all" };

export function revalidateFromPayload(payload: RevalidateRequest) {
  switch (payload.type) {
    case "article":
      return revalidateArticle(payload.slug);
    case "category":
      return revalidateCategory(payload.slug);
    case "tag":
      return revalidateTagEntity(payload.slug);
    case "author":
      return revalidateAuthor(payload.username);
    case "article-comments":
      return revalidateComments(payload.slug);
    case "all":
      return revalidateAllPublic();
    default:
      return;
  }
}
