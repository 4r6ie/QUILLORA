import "server-only";

import { prisma } from "@/lib/db/client";
import { withTimeout } from "@/lib/resilience/timeout";

/**
 * Database metrics (requirement 12).
 *
 * Reads PostgreSQL's statistics views: size, connections, commit/rollback,
 * cache hit ratio, deadlocks, per-table scan counts, and (when the extension
 * is installed) the slowest statements from `pg_stat_statements`.
 *
 * Every probe is bounded by a timeout so a monitoring request can never hang
 * or take down a request path.
 */

export type DatabaseMetrics = {
  ok: boolean;
  timestamp: string;
  database: {
    sizeBytes: number | null;
    activeConnections: number | null;
    maxConnections: number | null;
    connectionUtilization: number | null;
    committed: number | null;
    rolledBack: number | null;
    cacheHitRatio: number | null;
    deadlocks: number | null;
    waitingQueries: number | null;
  };
  tables: {
    name: string;
    rowEstimate: number;
    seqScans: number;
    indexScans: number;
  }[];
  slowQueries: {
    calls: number;
    meanTimeMs: number;
    totalTimeMs: number;
    query: string;
  }[];
  error?: string;
};

const TIMEOUT_MS = 5000;

async function probe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await withTimeout(fn(), { ms: TIMEOUT_MS, fallback });
  } catch {
    return fallback;
  }
}

export async function collectDatabaseMetrics(): Promise<DatabaseMetrics> {
  const base = {
    ok: true,
    timestamp: new Date().toISOString(),
    database: {
      sizeBytes: null,
      activeConnections: null,
      maxConnections: null,
      connectionUtilization: null,
      committed: null,
      rolledBack: null,
      cacheHitRatio: null,
      deadlocks: null,
      waitingQueries: null,
    },
    tables: [],
    slowQueries: [],
  } as DatabaseMetrics;

  try {
    const [sizeRows, statRows, settingRows, activityRows, tableRows] =
      await Promise.all([
        probe(
          () =>
            prisma.$queryRaw<{ size: bigint }[]>`
              SELECT pg_database_size(current_database()) AS size
            `,
          [{ size: 0n }],
        ),
        probe(
          () =>
            prisma.$queryRaw<
              {
                xact_commit: bigint;
                xact_rollback: bigint;
                blks_hit: bigint;
                blks_read: bigint;
                deadlocks: bigint;
              }[]
            >`
              SELECT xact_commit, xact_rollback, blks_hit, blks_read, deadlocks
              FROM pg_stat_database
              WHERE datname = current_database()
            `,
          [] as {
            xact_commit: bigint;
            xact_rollback: bigint;
            blks_hit: bigint;
            blks_read: bigint;
            deadlocks: bigint;
          }[],
        ),
        probe(
          () =>
            prisma.$queryRaw<{ max_connections: number }[]>`
              SELECT current_setting('max_connections')::int AS max_connections
            `,
          [{ max_connections: 0 }],
        ),
        probe(
          () =>
            prisma.$queryRaw<{ count: bigint }[]>`
              SELECT count(*)::bigint AS count
              FROM pg_stat_activity
              WHERE datname = current_database()
            `,
          [{ count: 0n }],
        ),
        probe(
          () =>
            prisma.$queryRaw<
              { relname: string; n_live_tup: number; seq_scan: bigint; idx_scan: bigint }[]
            >`
              SELECT relname, n_live_tup, seq_scan, idx_scan
              FROM pg_stat_user_tables
              ORDER BY n_live_tup DESC
              LIMIT 20
            `,
          [] as {
            relname: string;
            n_live_tup: number;
            seq_scan: bigint;
            idx_scan: bigint;
          }[],
        ),
      ]);

    const stat = statRows[0];
    const totalBlocks = Number(stat?.blks_hit ?? 0) + Number(stat?.blks_read ?? 0);
    const active = Number(activityRows[0]?.count ?? 0);
    const max = Number(settingRows[0]?.max_connections ?? 0);

    base.database = {
      sizeBytes: Number(sizeRows[0]?.size ?? 0),
      activeConnections: active,
      maxConnections: max,
      connectionUtilization: max > 0 ? Number((active / max).toFixed(4)) : null,
      committed: stat ? Number(stat.xact_commit) : null,
      rolledBack: stat ? Number(stat.xact_rollback) : null,
      cacheHitRatio:
        totalBlocks > 0
          ? Number((Number(stat?.blks_hit ?? 0) / totalBlocks).toFixed(4))
          : null,
      deadlocks: stat ? Number(stat.deadlocks) : null,
      waitingQueries: null,
    };

    base.tables = tableRows.map((row) => ({
      name: row.relname,
      rowEstimate: Number(row.n_live_tup),
      seqScans: Number(row.seq_scan),
      indexScans: Number(row.idx_scan),
    }));

    // Optional extension: pg_stat_statements. Absence is not an error.
    const slow = await probe(
      () =>
        prisma.$queryRaw<
          { calls: bigint; mean_exec_time: number; total_exec_time: number; query: string }[]
        >`
          SELECT calls, mean_exec_time, total_exec_time, left(query, 240) AS query
          FROM pg_stat_statements
          ORDER BY mean_exec_time DESC
          LIMIT 10
        `,
      [] as {
        calls: bigint;
        mean_exec_time: number;
        total_exec_time: number;
        query: string;
      }[],
    );
    base.slowQueries = slow.map((row) => ({
      calls: Number(row.calls),
      meanTimeMs: Number(row.mean_exec_time),
      totalTimeMs: Number(row.total_exec_time),
      query: row.query,
    }));
  } catch (error) {
    base.ok = false;
    base.error = error instanceof Error ? error.message : String(error);
  }

  return base;
}
