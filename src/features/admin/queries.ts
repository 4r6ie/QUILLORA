import "server-only";

import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/security/guards";
import { buildPageInfo, DEFAULT_PAGE_SIZE } from "@/lib/pagination";

/**
 * Admin/moderation reads. Separated from the public read path (requirement 14)
 * and always authorized with editor/admin roles.
 */
export async function getReviewQueue(options: { limit?: number } = {}) {
  await requireRole("editor", "admin");
  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, 50);

  const rows = await prisma.article.findMany({
    where: { status: "in_review" },
    include: {
      author: { select: { id: true, username: true, fullName: true } },
      category: { select: { slug: true, name: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const { items, pageInfo } = buildPageInfo(rows, limit);
  return { items, ...pageInfo };
}

export async function getAdminStats() {
  await requireRole("editor", "admin");

  const [published, inReview, drafts, archived, authors, comments] =
    await Promise.all([
      prisma.article.count({ where: { status: "published" } }),
      prisma.article.count({ where: { status: "in_review" } }),
      prisma.article.count({ where: { status: "draft" } }),
      prisma.article.count({ where: { status: "archived" } }),
      prisma.profile.count({ where: { role: { in: ["author", "editor", "admin"] } } }),
      prisma.comment.count(),
    ]);

  return { published, inReview, drafts, archived, authors, comments };
}

/** All articles, newest first, optionally filtered by status. */
export async function getAllArticles(
  options: { limit?: number; status?: "draft" | "in_review" | "published" | "archived" } = {},
) {
  await requireRole("editor", "admin");
  const limit = Math.min(options.limit ?? 50, 100);

  return prisma.article.findMany({
    where: options.status ? { status: options.status } : undefined,
    include: {
      author: { select: { id: true, username: true, fullName: true } },
      category: { select: { slug: true, name: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit,
  });
}
