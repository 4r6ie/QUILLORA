"use client";

import { createBrowserClient } from "@supabase/ssr";

import { envPublic } from "@/lib/env-public";

/**
 * Browser Supabase client. Only the publishable/anon key is exposed here.
 */
export const supabaseBrowser = createBrowserClient(
  envPublic.NEXT_PUBLIC_SUPABASE_URL,
  envPublic.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  },
);
