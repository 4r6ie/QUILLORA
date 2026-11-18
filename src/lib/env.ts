import "server-only";

import { z } from "zod";

/**
 * Server-only validated environment. Every field has a default so that
 * `next build` and static analysis never crash when env vars are absent;
 * format validation is applied only to values that are actually set.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("QUILLORA"),

  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .optional()
    .default("")
    .refine(
      (v) =>
        v === "" ||
        /^https:\/\/.+\.supabase\.co$/.test(v) ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(v),
      {
        message:
          "NEXT_PUBLIC_SUPABASE_URL must be a https://*.supabase.co URL (or a local Supabase URL)",
      },
    ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().default(""),

  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),

  // Pooled connection for request traffic.
  DATABASE_URL: z.string().optional().default(""),
  // Direct connection for migrations only.
  DIRECT_URL: z.string().optional().default(""),
  // Optional read replica.
  READ_DATABASE_URL: z.string().optional().default(""),

  REVALIDATE_SECRET: z.string().optional().default(""),

  SUPABASE_MANAGEMENT_API_TOKEN: z.string().optional().default(""),
  SUPABASE_PROJECT_REF: z.string().optional().default(""),
  ALERT_WEBHOOK_URL: z.string().optional().default(""),
  ALERT_EMAILS: z.string().optional().default(""),
  MONITOR_TOKEN: z.string().optional().default(""),
  COST_ALERT_THRESHOLD: z.coerce.number().optional().default(50),
  STORAGE_ALERT_THRESHOLD_GB: z.coerce.number().optional().default(5),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast on real misconfiguration, but never leak secret values.
  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  throw new Error(`Invalid server environment configuration: ${issues}`);
}

export const env = parsed.data;

export const isDatabaseConfigured = Boolean(
  env.DATABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL,
);

export const isReadReplicaConfigured = Boolean(
  env.READ_DATABASE_URL && env.READ_DATABASE_URL !== env.DATABASE_URL,
);
