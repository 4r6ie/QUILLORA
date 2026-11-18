"use server";

import { createHash } from "node:crypto";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { envPublic } from "@/lib/env-public";
import {
  identifierFromHeaders,
  rateLimit,
  rateLimitPresets,
  type RateLimitResult,
} from "@/lib/rate-limit";
import { revalidateAuthor } from "@/lib/cache/revalidate";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type AuthResult,
} from "@/features/auth/schemas";
import { profileInputSchema } from "@/features/articles/schemas";

/**
 * Auth server actions.
 *
 * Every action:
 *  1. is rate limited twice — per network (IP) and, when an email is present,
 *     per account (hashed) so rotating IPs cannot brute force one address;
 *  2. validates with zod and returns a user-facing message, never a raw driver
 *     or provider error string;
 *  3. performs account creation atomically from the product's point of view —
 *     if the profile insert fails, the auth user is deleted again so no
 *     unusable orphan account survives.
 *
 * Responses are always dynamic and never cached: the route modules set
 * `force-dynamic` + `no-store`, and Supabase sessions live in cookies.
 */

const PROFILE_WRITE_LIMIT = { limit: 20, windowMs: 15 * 60 * 1000 };

function tooMany(result: RateLimitResult): AuthResult {
  const minutes = Math.max(1, Math.ceil(result.retryAfterSeconds / 60));
  return {
    error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    retryAfterSeconds: result.retryAfterSeconds,
  };
}

/**
 * Dual-key auth throttle. `email` is hashed before it becomes a bucket key so
 * `rate_limit_buckets` never turns into a list of user email addresses.
 */
async function authRateLimit(scope: string, email?: string): Promise<AuthResult | null> {
  const ip = identifierFromHeaders(await headers());

  const byIp = await rateLimit({
    key: `${scope}:ip:${ip}`,
    ...rateLimitPresets.auth,
  });
  if (!byIp.ok) return tooMany(byIp);

  if (email) {
    const account = createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
    const byAccount = await rateLimit({
      key: `${scope}:acct:${account}`,
      ...rateLimitPresets.authAccount,
    });
    if (!byAccount.ok) return tooMany(byAccount);
  }

  return null;
}

function readEmail(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const email = (input as { email?: unknown }).email;
  return typeof email === "string" ? email : undefined;
}

/** Provider errors are useful for logs, dangerous for screens. */
function mapSignUpError(error: { message: string; status?: number }): string {
  const message = error.message.toLowerCase();
  if (error.status === 429 || message.includes("rate limit")) {
    return "Too many sign-up attempts. Please wait a minute and try again.";
  }
  if (message.includes("already registered")) {
    return "That email is already registered. Try signing in instead.";
  }
  if (message.includes("password")) {
    return "That password is not accepted. Choose a stronger one.";
  }
  if (message.includes("invalid email")) {
    return "Enter a valid email address.";
  }
  return "We could not create your account. Please try again.";
}

function isUniqueViolation(error: unknown, field: string): boolean {
  const candidate = error as { code?: string; meta?: { target?: unknown } };
  if (candidate?.code !== "P2002") return false;
  const target = candidate.meta?.target;
  return Array.isArray(target) && target.some((value) => value === field);
}

/** Roll back an auth user whose profile could not be created. */
async function deleteAuthUserQuietly(id: string): Promise<void> {
  try {
    await supabaseAdmin.auth.admin.deleteUser(id);
  } catch (error) {
    // The service-role key may be absent in local setups. Log loudly: an
    // orphan account needs manual repair via scripts/repair-profiles.mjs.
    console.error("[auth] could not roll back auth user", id, error);
  }
}

export async function login(input: unknown): Promise<AuthResult> {
  const limited = await authRateLimit("login", readEmail(input));
  if (limited) return limited;

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
  });
  if (error) {
    // Deliberately vague: never reveal whether the account exists.
    return { error: "Invalid email or password." };
  }

  redirect("/dashboard");
}

export async function register(input: unknown): Promise<AuthResult> {
  const limited = await authRateLimit("register", readEmail(input));
  if (limited) return limited;

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: issue?.message ?? "Please check the form.",
      field: issue?.path[0],
    };
  }

  const email = parsed.data.email.toLowerCase();
  const username = parsed.data.username;
  const fullName = parsed.data.fullName ?? null;

  // Usernames are public (/authors/[username]), so a pre-check leaks nothing.
  // Emails are private, so they are deliberately NOT pre-checked: Supabase's
  // "identities is empty" response below handles duplicates without turning
  // the form into an account-enumeration oracle.
  const taken = await prisma.profile.findUnique({
    where: { username },
    select: { id: true },
  });
  if (taken) {
    return { error: "That username is already taken.", field: "username" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: {
      data: { full_name: fullName ?? username },
      // Without this, confirmation emails fall back to the dashboard root and
      // never reach the code-exchange handler.
      emailRedirectTo: `${envPublic.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/dashboard`,
    },
  });

  if (error) return { error: mapSignUpError(error) };

  // Supabase returns a user with an EMPTY identities array when the address is
  // already registered (a deliberate anti-enumeration behaviour). Never touch a
  // profile in that case, or an attacker learns the address exists.
  const authUser = data.user;
  const isExistingAccount =
    !authUser || (Array.isArray(authUser.identities) && authUser.identities.length === 0);
  if (isExistingAccount) {
    return {
      ok: true,
      message:
        "If that email is available, check your inbox to finish creating your account.",
    };
  }

  try {
    await prisma.profile.create({
      data: { id: authUser.id, email, username, fullName, role: "author" },
    });
  } catch (error) {
    // The unique index is the real arbiter for the username race: two people
    // can submit the same handle between the pre-check and this insert.
    if (isUniqueViolation(error, "username")) {
      await deleteAuthUserQuietly(authUser.id);
      return { error: "That username was just taken. Try another.", field: "username" };
    }
    console.error("[auth] profile create failed", authUser.id, error);
    await deleteAuthUserQuietly(authUser.id);
    return { error: "We could not finish creating your account. Please try again." };
  }

  // Email confirmations disabled (common in local dev): signUp already
  // returned a session, so land the user where they were going.
  if (data.session) redirect("/dashboard");

  return {
    ok: true,
    message: `Account created. We sent a confirmation link to ${email}.`,
  };
}

export async function forgotPassword(input: unknown): Promise<AuthResult> {
  const limited = await authRateLimit("forgot", readEmail(input));
  if (limited) return limited;

  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createSupabaseServerClient();
  const result = await supabase.auth
    .resetPasswordForEmail(parsed.data.email.toLowerCase(), {
      // The recovery link must establish a session before /reset-password can
      // call updateUser(); /auth/callback performs the PKCE code exchange.
      redirectTo: `${envPublic.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
    })
    .then((response) => response)
    .catch((error: unknown) => ({ error }));

  // Always report success to avoid leaking which emails exist.
  if (result.error) {
    console.error("[auth] password reset request failed", result.error);
  }

  return {
    ok: true,
    message: "If that email exists, a reset link is on its way. It expires in 60 minutes.",
  };
}

export async function resendConfirmation(input: unknown): Promise<AuthResult> {
  const limited = await authRateLimit("resend", readEmail(input));
  if (limited) return limited;

  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth
    .resend({
      type: "signup",
      email: parsed.data.email.toLowerCase(),
      options: {
        emailRedirectTo: `${envPublic.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/dashboard`,
      },
    })
    .catch((error: unknown) => {
      console.error("[auth] resend confirmation failed", error);
    });

  return {
    ok: true,
    message: "If that account needs confirmation, a new link is on its way.",
  };
}

export async function resetPassword(input: unknown): Promise<AuthResult> {
  const limited = await authRateLimit("reset");
  if (limited) return limited;

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Use at least 8 characters.", field: issue?.path[0] };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Reaching this action without a session means the recovery link was never
  // exchanged (expired, reused, or opened in another browser).
  if (!user) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("[auth] password update failed", user.id, error);
    return { error: "Could not update your password. Request a new link." };
  }

  // End the recovery session so the user proves the new password works. Leaving
  // it alive would let the login page's "already signed in" guard skip sign-in.
  await supabase.auth.signOut();

  redirect("/login?reset=1");
}

export async function signOut(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateProfile(input: unknown): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const limited = await rateLimit({ key: `profile:${user.id}`, ...PROFILE_WRITE_LIMIT });
  if (!limited.ok) return tooMany(limited);

  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue?.message ?? "Invalid profile.", field: issue?.path[0] };
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { username: true },
  });
  if (!profile) {
    return { error: "Your profile is missing. Please contact support." };
  }

  // `role` is intentionally absent: authorization is not a profile field. It is
  // changed only by an admin through a dedicated, audited action.
  await prisma.profile.update({
    where: { id: user.id },
    data: {
      fullName: parsed.data.fullName ?? null,
      bio: parsed.data.bio ?? null,
      avatarUrl: parsed.data.avatarUrl?.trim() || null,
    },
  });

  revalidateAuthor(profile.username);
  return { ok: true, message: "Profile updated." };
}
