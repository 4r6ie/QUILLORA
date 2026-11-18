"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { envPublic } from "@/lib/env-public";
import {
  identifierFromHeaders,
  rateLimitPreset,
} from "@/lib/rate-limit";
import { safe } from "@/lib/resilience/errors";
import { revalidateAuthor } from "@/lib/cache/revalidate";
import { slugify } from "@/lib/utils";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/features/auth/schemas";
import { profileInputSchema } from "@/features/articles/schemas";

/**
 * Auth server actions (requirement 10: authentication is rate limited).
 *
 * Auth responses are always dynamic and never cached: the route modules set
 * `force-dynamic` + `no-store`, and the Supabase client uses HTTP-only cookies.
 */

const AUTH_RATE_WINDOW_IDENTIFIER = "auth";

async function authRateLimit(requestId: string) {
  const result = await rateLimitPreset(AUTH_RATE_WINDOW_IDENTIFIER, requestId);
  if (!result.ok) {
    return {
      error:
        "Too many attempts. Please wait before trying again.",
    } as const;
  }
  return null;
}

export async function login(input: unknown) {
  const requestId = identifierFromHeaders(await headers());
  const limited = await authRateLimit(requestId);
  if (limited) return limited;

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid email and password." } as const;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Deliberately vague: do not reveal whether the account exists.
    return { error: "Invalid email or password." } as const;
  }

  redirect("/dashboard");
}

export async function register(input: unknown) {
  const requestId = identifierFromHeaders(await headers());
  const limited = await authRateLimit(requestId);
  if (limited) return limited;

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form.",
    } as const;
  }

  const username = slugify(parsed.data.username).replace(/-/g, "_");
  const existing = await prisma.profile.findFirst({
    where: { OR: [{ username }, { email: parsed.data.email }] },
    select: { id: true },
  });
  if (existing) {
    return { error: "That email or username is already registered." } as const;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName ?? parsed.data.username },
    },
  });

  if (error) return { error: error.message } as const;

  if (data.user) {
    await safe(
      () =>
        prisma.profile.create({
          data: {
            id: data.user!.id,
            email: parsed.data.email,
            username,
            fullName: parsed.data.fullName ?? parsed.data.username,
            role: "author",
          },
        }),
      undefined,
    );
  }

  return {
    ok: true as const,
    message:
      "Account created. Check your inbox to confirm your email, then sign in.",
  };
}

export async function forgotPassword(input: unknown) {
  const requestId = identifierFromHeaders(await headers());
  const limited = await authRateLimit(requestId);
  if (limited) return limited;

  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid email address." } as const;
  }

  const supabase = await createSupabaseServerClient();
  const result = await supabase.auth
    .resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${envPublic.NEXT_PUBLIC_SITE_URL}/reset-password`,
    })
    .then((r) => r)
    .catch((error: unknown) => ({ error }));

  // Always report success to avoid leaking which emails exist.
  if (result.error) {
    console.error("[auth] password reset request failed", result.error);
  }
  return {
    ok: true as const,
    message: "If that email exists, a reset link is on its way.",
  };
}

export async function resetPassword(input: unknown) {
  const requestId = identifierFromHeaders(await headers());
  const limited = await authRateLimit(requestId);
  if (limited) return limited;

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Password must be at least 8 characters." } as const;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: error.message } as const;

  redirect("/login");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateProfile(input: unknown) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." } as const;

  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile." } as const;
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { username: true },
  });
  if (!profile) return { error: "Profile not found." } as const;

  await prisma.profile.update({
    where: { id: user.id },
    data: {
      fullName: parsed.data.fullName ?? undefined,
      bio: parsed.data.bio ?? undefined,
      avatarUrl: parsed.data.avatarUrl ?? undefined,
      ...(parsed.data.role ? { role: parsed.data.role } : {}),
    },
  });

  revalidateAuthor(profile.username);
  return { ok: true as const };
}
