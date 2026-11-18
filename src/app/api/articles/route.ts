import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/supabase/server";
import { revalidateArticle } from "@/lib/cache/revalidate";
import { articleInputSchema } from "@/features/articles/schemas";
import {
  clientIdentifier,
  rateLimitPreset,
  tooManyRequestsResponse,
} from "@/lib/rate-limit";
import { slugify } from "@/lib/utils";
import { UnauthorizedError } from "@/lib/resilience/errors";

export const dynamic = "force-dynamic";

/**
 * Article submission API (requirement 10: rate limited).
 * Requires a Supabase session; authors submit into the review queue.
 */
export async function POST(request: Request) {
  const headers = { "cache-control": "no-store, max-age=0" };

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401, headers });
  }

  const identity = clientIdentifier(request);
  const limitResult = await rateLimitPreset("submission", identity);
  if (!limitResult.ok) {
    return tooManyRequestsResponse(limitResult);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const parsed = articleInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid article" },
      { status: 400, headers },
    );
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!profile) throw new UnauthorizedError();

  const status = parsed.data.status === "draft" ? "draft" : "in_review";
  const slug = await (async () => {
    const base = slugify(parsed.data.slug ?? parsed.data.title) || "article";
    let candidate = base;
    let suffix = 1;
    while (suffix <= 50) {
      const existing = await prisma.article.findFirst({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return `${base}-${Date.now()}`;
  })();

  const article = await prisma.article.create({
    data: {
      slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt ?? null,
      content: parsed.data.content,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      categoryId: parsed.data.categoryId ?? null,
      status,
      publishedAt: null,
      readingTime: Math.max(
        1,
        Math.round(parsed.data.content.trim().split(/\s+/).length / 200),
      ),
      authorId: user.id,
    },
    select: { id: true, slug: true },
  });

  revalidateArticle(slug);

  return NextResponse.json(
    { ok: true, id: article.id, slug: article.slug, status },
    { status: 201, headers },
  );
}
