import "server-only";

import { PrismaClient } from "@prisma/client";

/**
 * Primary Prisma client.
 *
 * `DATABASE_URL` must point at the Supabase pooler (port 6543, transaction
 * mode) with `pgbouncer=true` so it works with serverless/Vercel functions.
 * `DIRECT_URL` (port 5432) is only used by `prisma migrate deploy`.
 *
 * A single client instance is reused across hot reloads in development to
 * avoid exhausting the pooler with a new connection per request.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
