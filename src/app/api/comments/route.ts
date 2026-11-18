import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/supabase/server";
import { revalidateComments } from "@/lib/cache/revalidate";
import { commentInputSchema } from "@/features/articles/schemas";
import { getArticleComments } from "@/features/comments/queries";
import {
  clientIdentifier,
  rateLimitPreset,
  tooManyRequestsResponse,
} from "@/lib/rate-limit";
import { safe } from "@/lib/resilience/errors";

export const dynamic = "force-dynamic";

const commentQuerySchema = z.object({
  articleId: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/** Comment read API used by the client comment pager. */
export async function GET(request: Request) {
  const headers = { "cache-control": "no-store, max-age=0" };
  const url = new URL(request.url);
  const parsed = commentQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400, headers });
  }

  const identity = clientIdentifier(request);
  const limitResult = await rateLimitPreset("search", identity);
  if (!limitResult.ok) {
    return tooManyRequestsResponse(limitResult);
  }

  const result = await getArticleComments(parsed.data.articleId, {
    cursor: parsed.data.cursor ?? null,
    limit: parsed.data.limit ?? undefined,
  });
  return NextResponse.json(result, { headers });
}

/**
 * Comment submission (requirement 10: rate limited).
 * Comments are created as `pending` and appear publicly after moderation.
 */
export async function POST(request: Request) {
  const headers = { "cache-control": "no-store, max-age=0" };

  const identity = clientIdentifier(request);
  const limitResult = await rateLimitPreset("comment", identity);
  if (!limitResult.ok) {
    return tooManyRequestsResponse(limitResult);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const parsed = commentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid comment" },
      { status: 400, headers },
    );
  }

  const article = await prisma.article.findFirst({
    where: { id: parsed.data.articleId, status: "published", publishedAt: { not: null } },
    select: { id: true, slug: true },
  });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404, headers });
  }

  const user = await safe(() => getSessionUser(), null);

  const comment = await prisma.comment.create({
    data: {
      articleId: article.id,
      authorId: user?.id ?? null,
      authorName: parsed.data.authorName ?? null,
      content: parsed.data.content,
      status: "pending",
    },
    select: { id: true, createdAt: true },
  });

  revalidateComments(article.slug);

  return NextResponse.json(
    { ok: true, status: "pending", id: comment.id },
    { status: 201, headers },
  );
}
