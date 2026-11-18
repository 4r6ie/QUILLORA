import "server-only";

import { prisma } from "@/lib/db/client";

/**
 * Rate limiting (requirement 10).
 *
 * Backed by Postgres so it works in a multi-instance / serverless deployment
 * without an extra Redis dependency. A fixed-window counter row is upserted
 * atomically, which is cheap and safe under concurrency. When the database is
 * unreachable the limiter fails OPEN: limiting must never block a legitimate
 * write or silently lose user data.
 *
 * Presets cover the four required surfaces: authentication, comments, search,
 * and article submissions.
 */

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
};

export type RateLimitOptions = {
  /** Namespace + identifier, e.g. `auth:198.51.100.7`. */
  key: string;
  limit: number;
  windowMs: number;
};

export const rateLimitPresets = {
  auth: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 attempts / 15 min
  comment: { limit: 10, windowMs: 60 * 1000 }, // 10 comments / minute
  search: { limit: 60, windowMs: 60 * 1000 }, // 60 searches / minute
  submission: { limit: 20, windowMs: 60 * 1000 }, // 20 submissions / minute
} as const;

export type RateLimitPresetName = keyof typeof rateLimitPresets;

export async function rateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const { key, limit, windowMs } = options;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const resetAt = new Date(windowStart.getTime() + windowMs);

  try {
    const row = await prisma.rateLimitBucket.upsert({
      where: {
        key_windowStart: { key, windowStart },
      },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    const count = row.count;
    return {
      ok: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      retryAfterSeconds: Math.max(
        0,
        Math.ceil((resetAt.getTime() - Date.now()) / 1000),
      ),
    };
  } catch (error) {
    // Fail open. Log loudly so the degradation is observable.
    console.error(
      `[rate-limit] failed for "${key}"; allowing request`,
      error instanceof Error ? error.message : error,
    );
    return {
      ok: true,
      limit,
      remaining: limit,
      resetAt,
      retryAfterSeconds: 0,
    };
  }
}

export async function rateLimitPreset(
  preset: RateLimitPresetName,
  identifier: string,
): Promise<RateLimitResult> {
  const { limit, windowMs } = rateLimitPresets[preset];
  return rateLimit({ key: `${preset}:${identifier}`, limit, windowMs });
}

/** Best-effort client identity from request headers (behind a proxy/CDN). */
export function identifierFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

export function clientIdentifier(request: Request): string {
  return identifierFromHeaders(request.headers);
}

/** Build a standard 429 response for route handlers. */
export function tooManyRequestsResponse(result: RateLimitResult): Response {
  return Response.json(
    {
      error: "Too many requests",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.floor(result.resetAt.getTime() / 1000)),
      },
    },
  );
}
