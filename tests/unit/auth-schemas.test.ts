import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/auth/redirects";
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/features/auth/schemas";

/**
 * Regression tests for the Phase 1 defects.
 *
 * Everything here is pure validation, so it runs without Supabase or Postgres.
 */

const validRegistration = {
  email: "ada@example.com",
  username: "ada_lovelace",
  password: "correct horse battery",
  confirmPassword: "correct horse battery",
};

describe("registerSchema", () => {
  it("accepts a blank display name (the bug that blocked registration)", () => {
    const result = registerSchema.safeParse({ ...validRegistration, fullName: "" });

    expect(result.success).toBe(true);
    // Blank must normalise to `undefined` so the server stores NULL, not "".
    expect(result.success && result.data.fullName).toBeUndefined();
  });

  it("accepts a missing display name", () => {
    const result = registerSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
  });

  it("trims a provided display name", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      fullName: "  Ada Lovelace ",
    });
    expect(result.success && result.data.fullName).toBe("Ada Lovelace");
  });

  it("rejects a username with no letters or numbers", () => {
    const result = registerSchema.safeParse({ ...validRegistration, username: "___" });
    expect(result.success).toBe(false);
  });

  it("rejects usernames that start or end with a separator", () => {
    for (const username of ["_ada", "ada-", "-ada", "ada_"]) {
      expect(registerSchema.safeParse({ ...validRegistration, username }).success).toBe(
        false,
      );
    }
  });

  it("lowercases and trims the username", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      username: "  Ada_Lovelace  ",
    });
    expect(result.success && result.data.username).toBe("ada_lovelace");
  });

  it("reports a password mismatch on the confirm field", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      confirmPassword: "something else entirely",
    });

    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0]?.path).toEqual([
      "confirmPassword",
    ]);
  });

  it("requires at least 8 password characters", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("trims the email and keeps the password verbatim", () => {
    const result = loginSchema.safeParse({
      email: "  Ada@Example.com  ",
      password: " spaces matter ",
    });

    expect(result.success && result.data.email).toBe("Ada@Example.com");
    expect(result.success && result.data.password).toBe(" spaces matter ");
  });

  it("rejects a non-email address", () => {
    expect(loginSchema.safeParse({ email: "ada", password: "x" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "new password",
        confirmPassword: "new password",
      }).success,
    ).toBe(true);
  });

  it("accepts a payload without a confirm field", () => {
    expect(resetPasswordSchema.safeParse({ password: "new password" }).success).toBe(
      true,
    );
  });

  it("rejects a mismatch", () => {
    const result = resetPasswordSchema.safeParse({
      password: "new password",
      confirmPassword: "other password",
    });
    expect(result.success).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("allows same-origin paths", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("/reset-password?token=1")).toBe("/reset-password?token=1");
  });

  it("falls back for missing or foreign targets", () => {
    for (const value of [
      null,
      undefined,
      "",
      "dashboard",
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "/redirect?to=https://evil.com",
      "/ok\nSet-Cookie: x=1",
    ]) {
      expect(safeRedirectPath(value)).toBe("/dashboard");
    }
  });
});
