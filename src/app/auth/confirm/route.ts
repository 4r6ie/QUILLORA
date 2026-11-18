import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/auth/redirects";

export const dynamic = "force-dynamic";

/**
 * Token-hash verification endpoint for customised email templates.
 *
 * Supabase's default templates use a `code` (handled by /auth/callback). If a
 * template is changed to emit `{{ .TokenHash }}` with `?token_hash=…&type=…`,
 * it lands here instead and is verified directly.
 */
const ALLOWED_TYPES: EmailOtpType[] = [
  "signup",
  "recovery",
  "invite",
  "email_change",
  "magiclink",
  "email",
];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.redirect(new URL("/login?error=link_expired", url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    console.error("[auth] otp verification failed", error.message);
    return NextResponse.redirect(new URL("/login?error=link_expired", url.origin));
  }

  const target =
    type === "recovery"
      ? "/reset-password"
      : safeRedirectPath(url.searchParams.get("next"));

  return NextResponse.redirect(new URL(target, url.origin));
}
