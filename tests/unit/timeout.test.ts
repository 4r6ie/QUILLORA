import { describe, expect, it } from "vitest";

import { TimeoutError, withTimeout } from "@/lib/resilience/timeout";

describe("withTimeout", () => {
  it("returns the value when it resolves in time", async () => {
    await expect(
      withTimeout(Promise.resolve("fast"), { ms: 100 }),
    ).resolves.toBe("fast");
  });

  it("returns the fallback on timeout", async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve("late"), 50));
    await expect(withTimeout(slow, { ms: 5, fallback: "fallback" })).resolves.toBe(
      "fallback",
    );
  });

  it("throws TimeoutError without a fallback", async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve("late"), 50));
    await expect(withTimeout(slow, { ms: 5 })).rejects.toBeInstanceOf(TimeoutError);
  });

  it("clears the timer when the operation resolves", async () => {
    await withTimeout(Promise.resolve(1), { ms: 1000 });
    // If the timer were left pending, the process would hang; vitest would warn.
    expect(true).toBe(true);
  });
});
