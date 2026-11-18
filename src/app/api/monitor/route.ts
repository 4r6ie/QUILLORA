import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { collectMonitoringSnapshot } from "@/lib/monitoring";
import { getCurrentUser } from "@/lib/security/guards";
import { safe } from "@/lib/resilience/errors";

export const dynamic = "force-dynamic";

/**
 * Monitoring endpoint (requirements 12, 18).
 * Auth: `x-monitor-token` header, or a signed-in editor/admin session.
 */
export async function GET(request: Request) {
  const headers = { "cache-control": "no-store, max-age=0" };
  const token = request.headers.get("x-monitor-token");
  const tokenOk = Boolean(env.MONITOR_TOKEN) && token === env.MONITOR_TOKEN;

  let roleOk = false;
  if (!tokenOk) {
    const user = await safe(() => getCurrentUser(), null);
    roleOk = user?.profile?.role === "editor" || user?.profile?.role === "admin";
  }

  if (!tokenOk && !roleOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  const snapshot = await collectMonitoringSnapshot();
  return NextResponse.json(snapshot, {
    status: snapshot.database.ok ? 200 : 503,
    headers,
  });
}
