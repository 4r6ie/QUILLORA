import "server-only";

import { unstable_cache } from "next/cache";

import { prismaRead } from "@/lib/db/read";
import { buildPageInfo, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import type { CommentItem, CommentListResult } from "@/types";

/**
 * Comment reads. Cached per article + cursor so article pages stay cheap even
 * with heavy discussion. Only APPROVED comments are public.
 */

type CommentRow = {
  id: string;
  content: string;
  createdAt: Date;
  authorName: string | null;
  author: {
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
};

function mapComment(row: CommentRow): CommentItem {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    authorName: row.author?.fullName ?? row.authorName ?? "Reader",
    author: row.author,
  };
}

export const getArticleComments = unstable_cache(
  async (
    articleId: string,
    options: { limit?: number; cursor?: string | null } = {},
  ): Promise<CommentListResult> => {
    const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, 50);

    const rows = (await prismaRead.comment.findMany({
      where: { articleId, status: "approved" },
      include: {
        author: {
          select: { username: true, fullName: true, avatarUrl: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    })) as unknown as CommentRow[];

    const { items, pageInfo } = buildPageInfo(rows, limit);
    return { items: items.map(mapComment), ...pageInfo };
  },
  ["comments", "by-article"],
  { revalidate: 60, tags: ["comments"] },
);

export const getApprovedCommentCount = unstable_cache(
  async (articleId: string): Promise<number> => {
    return prismaRead.comment.count({
      where: { articleId, status: "approved" },
    });
  },
  ["comments", "count"],
  { revalidate: 60, tags: ["comments"] },
);
