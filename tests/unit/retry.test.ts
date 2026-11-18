import { describe, expect, it, vi } from "vitest";

import { isTransientError, retry } from "@/lib/resilience/retry";

describe("retry", () => {
  it("retries transient failures and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("timeout"), { code: "P2024" }))
      .mockResolvedValueOnce("ok");

    await expect(retry(fn, { retries: 2, baseDelayMs: 1 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient failures", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("validation failed"));
    await expect(retry(fn, { retries: 3, baseDelayMs: 1 })).rejects.toThrow(
      "validation failed",
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the retry budget", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("econnreset"), { code: "ECONNRESET" }));
    await expect(retry(fn, { retries: 2, baseDelayMs: 1 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("classifies transient errors", () => {
    expect(isTransientError(Object.assign(new Error("x"), { code: "P2024" }))).toBe(true);
    expect(isTransientError(new Error("deadlock detected"))).toBe(true);
    expect(isTransientError(new Error("syntax error"))).toBe(false);
  });
});
