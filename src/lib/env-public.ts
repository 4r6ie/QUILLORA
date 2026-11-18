import { z } from "zod";

/**
 * Public (browser-safe) environment. Kept separate from `src/lib/env.ts`
 * so a server-only secret can never be imported into a client bundle.
 */

const schema = z.object({
  // A trailing slash would turn `${SITE_URL}/auth/callback` into a
  // `//auth/callback` path that Supabase's redirect allow-list rejects, and
  // would double up slashes in the sitemap. Normalise once, here.
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("http://localhost:3000")
    .transform((value) => value.replace(/\/+$/, "")),
  NEXT_PUBLIC_APP_NAME: z.string().default("QUILLORA"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  throw new Error(`Invalid public environment configuration: ${issues}`);
}

export const envPublic = parsed.data;
