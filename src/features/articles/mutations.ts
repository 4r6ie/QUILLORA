"use server";

import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import type { ArticleStatus, Role } from "@prisma/client";

import { prisma } from "@/lib/db/client";
import { revalidateArticle } from "@/lib/cache/revalidate";
import {
  identifierFromHeaders,
  rateLimitPreset,
  type RateLimitPresetName,
} from "@/lib/rate-limit";
import { slugify } from "@/lib/utils";
import {
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  safe,
} from "@/lib/resilience/errors";
import { canEditArticle, requireRole, requireUser } from "@/lib/security/guards";
import { articleInputSchema, type ArticleInput } from "@/features/articles/schemas";

/**
 * Article writes (requirement 14: reads and writes are separated).
 *
 * Every mutation:
 *  1. verifies the caller's identity and role server-side,
 *  2. enforces a rate limit,
 *  3. writes via the primary client (never the read replica),
 *  4. records an audit-log entry,
 *  5. triggers on-demand cache revalidation for affected public pages.
 */

const AUTHOR_ROLES: Role[] = ["author", "editor", "admin"];
const EDITOR_ROLES: Role[] = ["editor", "admin"];

async function assertRateLimit(
  preset: RateLimitPresetName,
  identifier: string,
): Promise<void> {
  const result = await rateLimitPreset(preset, identifier);
  if (!result.ok) {
    throw new RateLimitError(result.retryAfterSeconds);
  }
}

async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId: string,
  metadata: Prisma.InputJsonValue = {},
) {
  await safe(
    () =>
      prisma.auditLog.create({
        data: { actorId, action, entity, entityId, metadata },
      }),
    undefined,
  );
}

/** Ensure a slug is unique, appending -2, -3, ... when necessary. */
async function uniqueSlug(base: string, ignoreArticleId?: string): Promise<string> {
  const root = base || "article";
  let candidate = root;
  let suffix = 1;

  // Bounded loop: at most 50 candidates, then fall back to a timestamped slug.
  while (suffix <= 50) {
    const existing = await prisma.article.findFirst({
      where: {
        slug: candidate,
        ...(ignoreArticleId ? { id: { not: ignoreArticleId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
  return `${root}-${Date.now()}`;
}

/** Create missing tags and return connectable tag records. */
async function syncTags(articleId: string, tagSlugs: string[]) {
  const cleaned = [...new Set(tagSlugs.map((slug) => slugify(slug)).filter(Boolean))];
  if (cleaned.length === 0) {
    await prisma.articleTag.deleteMany({ where: { articleId } });
    return [];
  }

  for (const slug of cleaned) {
    await prisma.tag.upsert({
      where: { slug },
      create: { slug, name: slug.replace(/-/g, " ") },
      update: {},
    });
  }

  const tags = await prisma.tag.findMany({
    where: { slug: { in: cleaned } },
    select: { id: true },
  });

  await prisma.articleTag.deleteMany({ where: { articleId } });
  if (tags.length > 0) {
    await prisma.articleTag.createMany({
      data: tags.map((tag) => ({ articleId, tagId: tag.id })),
      skipDuplicates: true,
    });
  }
  return tags;
}

function resolveStatus(
  requested: ArticleStatus | undefined,
  role: Role,
): { status: ArticleStatus; publishedAt: Date | null } {
  const now = new Date();
  if (requested === "archived") return { status: "archived", publishedAt: null };
  if (role === "editor" || role === "admin") {
    if (requested === "published") return { status: "published", publishedAt: now };
    if (requested === "in_review") return { status: "in_review", publishedAt: null };
    return { status: "draft", publishedAt: null };
  }
  // Authors never self-publish; submissions go to the review queue.
  if (requested === "draft") return { status: "draft", publishedAt: null };
  return { status: "in_review", publishedAt: null };
}

export async function createArticle(input: ArticleInput) {
  const user = await requireRole(...AUTHOR_ROLES);
  const parsed = articleInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      "Please check the article fields.",
      parsed.error.issues.map((issue) => issue.message),
    );
  }

  const requestId = identifierFromHeaders(await headers());
  await assertRateLimit("submission", user.id || requestId);

  const { status, publishedAt } = resolveStatus(parsed.data.status, user.profile!.role);
  const slug = await uniqueSlug(slugify(parsed.data.slug ?? parsed.data.title));

  const article = await prisma.article.create({
    data: {
      slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt ?? null,
      content: parsed.data.content,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      categoryId: parsed.data.categoryId ?? null,
      status,
      publishedAt,
      readingTime: Math.max(
        1,
        Math.round(parsed.data.content.trim().split(/\s+/).length / 200),
      ),
      authorId: user.id,
    },
    select: { id: true, slug: true },
  });

  await syncTags(article.id, parsed.data.tagSlugs);
  await audit(user.id, "article.create", "article", article.id, { slug });
  revalidateArticle(slug);

  return { ok: true as const, slug: article.slug, id: article.id };
}

export async function updateArticle(articleId: string, input: ArticleInput) {
  const user = await requireUser();
  const parsed = articleInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(
      "Please check the article fields.",
      parsed.error.issues.map((issue) => issue.message),
    );
  }

  const existing = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, authorId: true, status: true, slug: true, publishedAt: true },
  });
  if (!existing) throw new NotFoundError("Article not found");
  if (!canEditArticle(user, existing)) throw new ForbiddenError();

  const requestId = identifierFromHeaders(await headers());
  await assertRateLimit("submission", user.id || requestId);

  const slug =
    parsed.data.slug && parsed.data.slug !== existing.slug
      ? await uniqueSlug(slugify(parsed.data.slug), existing.id)
      : existing.slug;

  const nextStatus = resolveStatus(parsed.data.status, user.profile!.role);
  const wasPublished = existing.status === "published";

  const updated = await prisma.article.update({
    where: { id: existing.id },
    data: {
      slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt ?? null,
      content: parsed.data.content,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      categoryId: parsed.data.categoryId ?? null,
      readingTime: Math.max(
        1,
        Math.round(parsed.data.content.trim().split(/\s+/).length / 200),
      ),
      status: nextStatus.status,
      publishedAt:
        nextStatus.publishedAt ??
        (wasPublished ? existing.publishedAt ?? new Date() : null),
    },
    select: { id: true, slug: true },
  });

  await syncTags(updated.id, parsed.data.tagSlugs);
  await audit(user.id, "article.update", "article", updated.id, { slug });
  revalidateArticle(updated.slug);

  return { ok: true as const, slug: updated.slug, id: updated.id };
}

/** Editors/admins approve an article -> published. */
export async function approveArticle(articleId: string) {
  const user = await requireRole(...EDITOR_ROLES);
  const existing = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, slug: true },
  });
  if (!existing) throw new NotFoundError("Article not found");

  await prisma.article.update({
    where: { id: existing.id },
    data: { status: "published", publishedAt: new Date() },
  });

  await audit(user.id, "article.approve", "article", existing.id);
  revalidateArticle(existing.slug);
  return { ok: true as const, slug: existing.slug };
}

/** Editors/admins (or the author) unpublish -> archived. */
export async function unpublishArticle(articleId: string) {
  const user = await requireUser();
  const existing = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, slug: true, authorId: true, status: true },
  });
  if (!existing) throw new NotFoundError("Article not found");

  const isEditor = user.profile?.role === "editor" || user.profile?.role === "admin";
  if (!isEditor && existing.authorId !== user.id) throw new ForbiddenError();

  await prisma.article.update({
    where: { id: existing.id },
    data: { status: "archived", publishedAt: null },
  });

  await audit(user.id, "article.unpublish", "article", existing.id);
  revalidateArticle(existing.slug);
  return { ok: true as const };
}

export async function deleteArticle(articleId: string) {
  const user = await requireUser();
  const existing = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, slug: true, authorId: true, status: true },
  });
  if (!existing) throw new NotFoundError("Article not found");

  const isAdmin = user.profile?.role === "admin";
  if (!isAdmin && existing.authorId !== user.id && user.profile?.role !== "editor") {
    throw new ForbiddenError();
  }

  await prisma.article.delete({ where: { id: existing.id } });
  await audit(user.id, "article.delete", "article", existing.id);
  revalidateArticle(existing.slug);
  return { ok: true as const };
}

/** Author moves a draft into the review queue. */
export async function submitArticleForReview(articleId: string) {
  const user = await requireUser();
  const existing = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, slug: true, authorId: true, status: true },
  });
  if (!existing) throw new NotFoundError("Article not found");
  if (existing.authorId !== user.id && user.profile?.role !== "editor" && user.profile?.role !== "admin") {
    throw new ForbiddenError();
  }

  await prisma.article.update({
    where: { id: existing.id },
    data: { status: "in_review" },
  });

  await audit(user.id, "article.submit", "article", existing.id);
  revalidateArticle(existing.slug);
  return { ok: true as const };
}

/** Fire-and-forget view counter (write-heavy, never blocks the page). */
export async function recordArticleView(articleId: string) {
  await safe(
    () =>
      prisma.article.update({
        where: { id: articleId },
        data: { viewCount: { increment: 1 } },
      }),
    undefined,
  );
  return { ok: true as const };
}
