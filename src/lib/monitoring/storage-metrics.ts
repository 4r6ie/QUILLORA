import "server-only";

import { prisma } from "@/lib/db/client";
import { withTimeout } from "@/lib/resilience/timeout";

export type StorageMetrics = {
  ok: boolean;
  buckets: {
    id: string;
    objectCount: number;
    totalBytes: number;
    totalGb: number;
  }[];
  totalBytes: number;
  totalGb: number;
  error?: string;
};

/**
 * Storage utilization (requirement 12), read from `storage.objects` metadata.
 */
export async function collectStorageMetrics(): Promise<StorageMetrics> {
  const empty: StorageMetrics = {
    ok: true,
    buckets: [],
    totalBytes: 0,
    totalGb: 0,
  };

  try {
    const rows = await withTimeout(
      prisma.$queryRaw<
        { bucket_id: string; objects: bigint; bytes: bigint | null }[]
      >`
        SELECT bucket_id,
               count(*)::bigint AS objects,
               sum((metadata ->> 'size')::bigint) AS bytes
        FROM storage.objects
        GROUP BY bucket_id
      `,
      { ms: 5000, fallback: [] as { bucket_id: string; objects: bigint; bytes: bigint | null }[] },
    );

    const buckets = rows.map((row) => {
      const bytes = Number(row.bytes ?? 0);
      return {
        id: row.bucket_id,
        objectCount: Number(row.objects),
        totalBytes: bytes,
        totalGb: Number((bytes / 1024 / 1024 / 1024).toFixed(3)),
      };
    });

    const totalBytes = buckets.reduce((sum, bucket) => sum + bucket.totalBytes, 0);
    return {
      ok: true,
      buckets,
      totalBytes,
      totalGb: Number((totalBytes / 1024 / 1024 / 1024).toFixed(3)),
    };
  } catch (error) {
    return {
      ...empty,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
