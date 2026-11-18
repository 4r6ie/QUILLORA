import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/auth/redirects";

export const dynamic = "force-dynamic";

/**
 * PKCE code exchange endpoint.
 *
 * Supabase sends confirmation and recovery emails here with `?code=…`. The
 * exchange is what actually creates the cookie session; without it the emailed
 * link arrives at a page that has no session and every follow-up fails with
 * "Auth session missing".
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirectPath(url.searchParams.get("next"));

  if (url.searchParams.get("error_description") || !code) {
    return NextResponse.redirect(new URL("/login?error=link_expired", url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth] code exchange failed", error.message);
    return NextResponse.redirect(new URL("/login?error=link_expired", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
