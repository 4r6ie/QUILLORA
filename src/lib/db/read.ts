import "server-only";

import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";
import { prisma } from "@/lib/db/client";

/**
 * Read replica routing (requirement 15).
 *
 * When `READ_DATABASE_URL` is configured, every read query in the app goes
 * through this client and hits the replica. When it is not configured, reads
 * transparently fall back to the primary pooled connection, so enabling
 * replicas later is a zero-code-change operation.
 *
 * This is the single seam for read/write separation (requirement 14):
 * `prisma` is used for writes, `prismaRead` for reads.
 */
const globalForRead = globalThis as unknown as {
  prismaRead?: PrismaClient;
};

function createReadClient(): PrismaClient {
  if (!env.READ_DATABASE_URL) return prisma;

  return (
    globalForRead.prismaRead ??
    new PrismaClient({
      datasources: { db: { url: env.READ_DATABASE_URL } },
      log: ["error"],
    })
  );
}

export const prismaRead: PrismaClient = createReadClient();

if (process.env.NODE_ENV !== "production") {
  globalForRead.prismaRead = prismaRead;
}

/** True when reads are actually being served by a replica. */
export const usingReadReplica = prismaRead !== prisma;
