import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/client";
import { withTimeout } from "@/lib/resilience/timeout";

export const dynamic = "force-dynamic";

/** Liveness + database readiness. Never cached. */
export async function GET() {
  const headers = { "cache-control": "no-store, max-age=0" };
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, { ms: 3000 });
    return NextResponse.json(
      { status: "ok", database: "up", timestamp: new Date().toISOString() },
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        database: "down",
        error: error instanceof Error ? error.message : "unknown",
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers },
    );
  }
}
