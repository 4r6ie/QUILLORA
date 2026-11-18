/**
 * Request timeouts and graceful degradation (requirement 11).
 */

export class TimeoutError extends Error {
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

type WithTimeoutOptions<T> = {
  /** Return this value instead of throwing when the timeout fires. */
  fallback?: T;
  /** Called when the timeout fires (logging/metrics). */
  onTimeout?: (elapsedMs: number) => void;
  /** Timeout in milliseconds. Defaults to 8000. */
  ms?: number;
};

/**
 * Race a promise against a timeout. Never leaves the underlying timer pending.
 * If `fallback` is provided the caller degrades gracefully; otherwise a
 * TimeoutError is thrown so the nearest error boundary can handle it.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: WithTimeoutOptions<T> = {},
): Promise<T> {
  const { fallback, onTimeout, ms = 8000 } = options;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const start = Date.now();

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          const elapsed = Date.now() - start;
          onTimeout?.(elapsed);
          if (fallback !== undefined) {
            // Resolve with the fallback via a sentinel: Promise.race cannot
            // resolve with a value from the timer, so reject a special error
            // and catch it below.
            reject(new TimeoutFallback(fallback));
          } else {
            reject(new TimeoutError());
          }
        }, ms);
      }),
    ]);
  } catch (error) {
    if (fallback !== undefined) {
      if (error instanceof TimeoutFallback) {
        return error.value;
      }
      // If the underlying operation itself failed and a fallback exists,
      // degrade rather than surfacing a 500.
      return fallback;
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

class TimeoutFallback<T> extends Error {
  constructor(public readonly value: T) {
    super("timeout-fallback");
    this.name = "TimeoutFallback";
  }
}

/** Convert any thrown value into a message safe to log/show. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
