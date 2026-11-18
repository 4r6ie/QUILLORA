import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { envPublic } from "@/lib/env-public";

/**
 * Session refresh boundary.
 *
 * Next 16 renamed Middleware to Proxy and runs it on the Node.js runtime. This
 * is the only place where Supabase can persist a rotated refresh token: Server
 * Components are not allowed to set cookies, so without this file a signed-in
 * user silently loses their session once the access token expires.
 *
 * Keep this file free of `server-only` imports and database access — it runs on
 * every non-static request.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = envPublic.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = envPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // A misconfigured deployment must still render public pages.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
    },
  });

  // Triggers a refresh when the access token is near expiry and writes the new
  // cookie pair onto the outgoing response.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml)$).*)",
  ],
};
