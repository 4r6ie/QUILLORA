import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { revalidateFromPayload } from "@/lib/cache/revalidate";

export const dynamic = "force-dynamic";

/**
 * On-demand revalidation endpoint (requirement 3).
 *
 * Supabase webhooks / Realtime / CI can POST here when content changes. The
 * caller must present the shared `x-revalidate-secret`.
 */
const payloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("article"), slug: z.string().min(1) }),
  z.object({ type: z.literal("category"), slug: z.string().min(1) }),
  z.object({ type: z.literal("tag"), slug: z.string().min(1) }),
  z.object({ type: z.literal("author"), username: z.string().min(1) }),
  z.object({ type: z.literal("article-comments"), slug: z.string().min(1) }),
  z.object({ type: z.literal("all") }),
]);

export async function POST(request: Request) {
  const headers = { "cache-control": "no-store, max-age=0" };
  const secret = request.headers.get("x-revalidate-secret");

  if (!env.REVALIDATE_SECRET || secret !== env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400, headers },
    );
  }

  try {
    revalidateFromPayload(parsed.data);
    return NextResponse.json({ ok: true, revalidated: parsed.data }, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Revalidation failed" },
      { status: 500, headers },
    );
  }
}
