import "server-only";

import { createClient } from "@supabase/supabase-js";

import { envPublic } from "@/lib/env-public";
import { env } from "@/lib/env";

/**
 * Service-role Supabase client. NEVER import this from a client component or
 * pass its key to the browser. Used for admin operations, storage management,
 * and server-to-server work.
 */
export const supabaseAdmin = (() => {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    // Return a proxy that throws on use, so a missing key fails loudly at the
    // call site instead of silently using an anonymous client.
    return new Proxy({} as ReturnType<typeof createClient>, {
      get() {
        throw new Error(
          "SUPABASE_SERVICE_ROLE_KEY is not configured; admin Supabase client is unavailable.",
        );
      },
    });
  }

  return createClient(
    envPublic.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
})();
