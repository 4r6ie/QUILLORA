/**
 * Retry strategies (requirement 11).
 *
 * Transient failures (network blips, pooler saturation, statement timeouts,
 * 429/5xx from Supabase) are retried with exponential backoff + jitter.
 * Non-transient failures fail immediately.
 */

export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Return false to stop retrying for a given error/attempt. */
  retryOn?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
};

/** Prisma / Postgres / network errors that are worth retrying. */
export function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code =
    (error as { code?: string }).code ??
    (error as { cause?: { code?: string } }).cause?.code;

  // Prisma: P1001 (can't reach DB), P2024 (query timeout / pool timeout),
  // P2034 (transaction conflict), P2025 (record not found in transaction).
  if (typeof code === "string" && ["P1001", "P2024", "P2034"].includes(code)) {
    return true;
  }

  const message = (error as Error).message?.toLowerCase() ?? "";
  return (
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("econnrefused") ||
    message.includes("too many connections") ||
    message.includes("connection terminated") ||
    message.includes("statement timeout") ||
    message.includes("deadlock") ||
    message.includes("429") ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("504")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoff(attempt: number, baseDelayMs: number, maxDelayMs: number) {
  const exponential = baseDelayMs * 2 ** attempt;
  const jitter = Math.random() * baseDelayMs;
  return Math.min(maxDelayMs, exponential + jitter);
}

export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    retries = 3,
    baseDelayMs = 150,
    maxDelayMs = 2000,
    retryOn = isTransientError,
    onRetry,
  } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const canRetry = attempt < retries && retryOn(error, attempt);
      if (!canRetry) break;
      const delay = backoff(attempt, baseDelayMs, maxDelayMs);
      onRetry?.(error, attempt + 1, delay);
      await sleep(delay);
    }
  }
  throw lastError;
}
