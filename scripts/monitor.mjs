/**
 * Database + storage monitoring CLI (requirement 12).
 * Prints a snapshot and evaluates thresholds; posts alerts when configured.
 *
 *   npm run monitor
 */
import { loadEnv, withClient, log } from "./lib.mjs";

const COST_THRESHOLD = Number(process.env.COST_ALERT_THRESHOLD ?? 50);
const STORAGE_THRESHOLD_GB = Number(process.env.STORAGE_ALERT_THRESHOLD_GB ?? 5);

async function collect(client) {
  const [db] = await client.query(`
    SELECT
      pg_database_size(current_database()) AS size,
      (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) AS connections,
      current_setting('max_connections')::int AS max_connections,
      (SELECT xact_commit FROM pg_stat_database WHERE datname = current_database()) AS committed,
      (SELECT xact_rollback FROM pg_stat_database WHERE datname = current_database()) AS rolled_back,
      (SELECT blks_hit FROM pg_stat_database WHERE datname = current_database()) AS blks_hit,
      (SELECT blks_read FROM pg_stat_database WHERE datname = current_database()) AS blks_read,
      (SELECT deadlocks FROM pg_stat_database WHERE datname = current_database()) AS deadlocks
  `);

  const tables = await client.query(`
    SELECT relname, n_live_tup, seq_scan, idx_scan
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC
    LIMIT 10
  `);

  let slow = [];
  try {
    slow = (
      await client.query(`
        SELECT calls, mean_exec_time, left(query, 160) AS query
        FROM pg_stat_statements
        ORDER BY mean_exec_time DESC
        LIMIT 5
      `)
    ).rows;
  } catch {
    slow = [];
  }

  let storage = { total_gb: 0, buckets: [] };
  try {
    const buckets = await client.query(`
      SELECT bucket_id,
             count(*)::bigint AS objects,
             sum((metadata ->> 'size')::bigint) AS bytes
      FROM storage.objects
      GROUP BY bucket_id
    `);
    const bytes = buckets.rows.reduce((sum, row) => sum + Number(row.bytes ?? 0), 0);
    storage = {
      total_gb: Number((bytes / 1024 / 1024 / 1024).toFixed(3)),
      buckets: buckets.rows.map((row) => ({
        id: row.bucket_id,
        objects: Number(row.objects),
        bytes: Number(row.bytes ?? 0),
      })),
    };
  } catch {
    storage = { total_gb: 0, buckets: [], unavailable: true };
  }

  return { db, tables: tables.rows, slow, storage };
}

function evaluate({ db, storage }) {
  const alerts = [];
  const totalBlocks = Number(db.blks_hit ?? 0) + Number(db.blks_read ?? 0);
  const hitRatio = totalBlocks > 0 ? Number(db.blks_hit ?? 0) / totalBlocks : null;
  const utilization =
    db.max_connections > 0 ? db.connections / db.max_connections : null;

  if (utilization !== null && utilization > 0.8) {
    alerts.push(`connections ${(utilization * 100).toFixed(1)}% > 80%`);
  }
  if (hitRatio !== null && hitRatio < 0.95) {
    alerts.push(`cache hit ratio ${(hitRatio * 100).toFixed(1)}% < 95%`);
  }
  if (Number(db.deadlocks ?? 0) > 0) {
    alerts.push(`deadlocks: ${db.deadlocks}`);
  }
  if (storage.total_gb > STORAGE_THRESHOLD_GB) {
    alerts.push(`storage ${storage.total_gb} GB > ${STORAGE_THRESHOLD_GB} GB`);
  }
  return alerts;
}

async function alert(alerts) {
  const webhook = process.env.ALERT_WEBHOOK_URL;
  if (!webhook) {
    log("alerts (no webhook configured):", alerts);
    return;
  }
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `QUILLORA alerts:\n- ${alerts.join("\n- ")}` }),
    });
    log("alerts posted:", alerts.length);
  } catch (error) {
    console.error("[monitor] alert delivery failed:", error);
  }
}

loadEnv(".env.local");
loadEnv(".env");

withClient(async (client) => {
  const snapshot = await collect(client);
  const alerts = evaluate(snapshot);
  const sizeGb = Number((Number(snapshot.db.size) / 1024 / 1024 / 1024).toFixed(3));

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    database: {
      sizeGb,
      connections: snapshot.db.connections,
      maxConnections: snapshot.db.max_connections,
      committed: snapshot.db.committed,
      rolledBack: snapshot.db.rolled_back,
      deadlocks: snapshot.db.deadlocks,
    },
    storage: snapshot.storage,
    topTables: snapshot.tables,
    slowQueries: snapshot.slow,
    thresholds: { costUsd: COST_THRESHOLD, storageGb: STORAGE_THRESHOLD_GB },
    alerts,
  }, null, 2));

  if (alerts.length > 0) await alert(alerts);
}).catch((error) => {
  console.error("[monitor] failed:", error);
  process.exit(1);
});
