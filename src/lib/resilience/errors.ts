/**
 * Typed application errors + safe execution helpers (requirement 11).
 */

export class AppError extends Error {
  readonly status: number;
  readonly cause?: unknown;

  constructor(message: string, options: { status?: number; cause?: unknown } = {}) {
    super(message);
    this.name = "AppError";
    this.status = options.status ?? 500;
    this.cause = options.cause;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, { status: 404 });
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  readonly issues: string[];
  constructor(message = "Validation failed", issues: string[] = []) {
    super(message, { status: 400 });
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, { status: 401 });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do that") {
    super(message, { status: 403 });
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds = 60) {
    super("Too many requests", { status: 429 });
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError(error.message, { status: 500, cause: error });
  }
  return new AppError(String(error), { status: 500 });
}

/**
 * Run an async function and substitute `fallback` on any failure. Used at the
 * edge of public pages so a database hiccup renders an empty state instead of
 * a 500, and so no visitor-visible request ever fails hard.
 */
export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
