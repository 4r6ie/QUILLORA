import "server-only";

import { env } from "@/lib/env";

/**
 * Supabase usage + cost (requirement 18).
 *
 * Uses the Supabase Management API. When credentials are absent the module
 * reports `configured: false` so the alerting script can degrade to a no-op
 * instead of crashing cron.
 */
export type UsageReport = {
  configured: boolean;
  projectRef: string;
  project?: {
    name?: string;
    region?: string;
    createdAt?: string;
    // Plan/cost fields vary by API version; kept loose on purpose.
    [key: string]: unknown;
  };
  cost?: {
    amount?: number;
    currency?: string;
  };
  error?: string;
};

export async function fetchUsageReport(): Promise<UsageReport> {
  const projectRef = env.SUPABASE_PROJECT_REF;
  const token = env.SUPABASE_MANAGEMENT_API_TOKEN;

  if (!projectRef || !token) {
    return { configured: false, projectRef };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: token,
    "content-type": "application/json",
  };

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}`,
      { headers, cache: "no-store" },
    );

    if (!response.ok) {
      return {
        configured: true,
        projectRef,
        error: `Management API responded ${response.status}`,
      };
    }

    const project = (await response.json()) as UsageReport["project"];

    // Cost endpoint availability varies by plan/org. Try the documented path;
    // a 404 simply means "not exposed", which is not an error.
    let cost: UsageReport["cost"];
    try {
      const costResponse = await fetch(
        `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/cost`,
        { headers, cache: "no-store" },
      );
      if (costResponse.ok) {
        const data = (await costResponse.json()) as {
          estimated_cost?: number;
          currency?: string;
          amount?: number;
        };
        cost = {
          amount: data.estimated_cost ?? data.amount,
          currency: data.currency ?? "USD",
        };
      }
    } catch {
      // Ignore: cost is best-effort.
    }

    return { configured: true, projectRef, project, cost };
  } catch (error) {
    return {
      configured: true,
      projectRef,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
