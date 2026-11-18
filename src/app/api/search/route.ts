import { NextResponse } from "next/server";

import { searchArticles } from "@/features/search/queries";
import {
  clientIdentifier,
  rateLimitPreset,
  tooManyRequestsResponse,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Rate-limited search API (requirement 10). */
export async function GET(request: Request) {
  const headers = { "cache-control": "no-store, max-age=0" };
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 200);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 12) || 12));

  const identity = clientIdentifier(request);
  const limitResult = await rateLimitPreset("search", identity);
  if (!limitResult.ok) {
    return tooManyRequestsResponse(limitResult);
  }

  try {
    const result = await searchArticles(q, page, limit);
    return NextResponse.json(result, {
      headers: {
        ...headers,
        "x-ratelimit-limit": String(limitResult.limit),
        "x-ratelimit-remaining": String(limitResult.remaining),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500, headers },
    );
  }
}
