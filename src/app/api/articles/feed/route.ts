import { NextResponse } from "next/server";
import { z } from "zod";

import { getPublishedArticles } from "@/features/articles/queries";
import {
  clientIdentifier,
  rateLimitPreset,
  tooManyRequestsResponse,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Feed API used by the client pagination component. Keeps the public pages
 * static (ISR) while still paginating without loading the whole collection.
 */
const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  categoryId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const headers = { "cache-control": "no-store, max-age=0" };
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400, headers });
  }

  const identity = clientIdentifier(request);
  const limitResult = await rateLimitPreset("search", identity);
  if (!limitResult.ok) {
    return tooManyRequestsResponse(limitResult);
  }

  try {
    const result = await getPublishedArticles(parsed.data);
    return NextResponse.json(result, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feed failed" },
      { status: 500, headers },
    );
  }
}
