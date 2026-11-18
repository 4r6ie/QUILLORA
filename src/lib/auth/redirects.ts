const FALLBACK = "/dashboard";

/**
 * Sanitise a `next` query parameter used by /auth/callback and /auth/confirm.
 *
 * Only same-origin absolute paths are allowed. This blocks `//evil.com`,
 * `/\evil.com` (which browsers normalise to a protocol-relative URL) and
 * anything that is not a path, so an emailed link can never be turned into an
 * open redirect.
 */
/**
 * Detect the error Next throws from `redirect()`.
 *
 * The digest is not the bare string `NEXT_REDIRECT`: Next encodes the whole
 * instruction, e.g. `NEXT_REDIRECT;push;/dashboard;303;`. Comparing for
 * equality therefore never matches and turns a successful redirect into a
 * visible "Something went wrong".
 */
export function isRedirectDigest(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null | undefined)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export function safeRedirectPath(value: string | null | undefined): string {
  if (!value) return FALLBACK;
  if (!value.startsWith("/")) return FALLBACK;
  if (value.startsWith("//") || value.startsWith("/\\")) return FALLBACK;
  if (value.includes("://") || value.includes("\n") || value.includes("\r")) return FALLBACK;
  return value;
}
