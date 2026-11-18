import { z } from "zod";

/**
 * Auth input contracts.
 *
 * Two rules encoded here on purpose:
 *
 * 1. Optional text fields accept `""` and normalise it to `undefined`. A client
 *    that submits an empty "display name" (the browser always sends every
 *    field) must never fail with "String must contain at least 1 character".
 * 2. A username must start and end with a letter or number. The previous
 *    pattern accepted `"___"`, which slugified to an empty string and blew up
 *    the profile insert *after* the auth user had already been created.
 */

const emailSchema = z
  .string()
  .trim()
  .max(200, "Email is too long")
  .email("Enter a valid email address");

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "Password is too long");

/** Trimmed text that is treated as "not provided" when empty. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().max(200),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "Use at least 3 characters")
      .max(40, "Use at most 40 characters")
      .regex(
        /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])$/,
        "Start and end with a letter or number; use a–z, 0–9, _ or -",
      )
      .refine((value) => /[a-z0-9]/.test(value), "Username must contain a letter or number"),
    fullName: optionalText(120, "Display name is too long"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().max(200).optional(),
  })
  .refine(
    (data) => data.confirmPassword === undefined || data.password === data.confirmPassword,
    { path: ["confirmPassword"], message: "Passwords do not match" },
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Result shape every auth server action returns (redirecting actions throw). */
export type AuthResult =
  | { ok: true; message?: string }
  | { error: string; field?: string | number; retryAfterSeconds?: number };
