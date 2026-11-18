import "server-only";

import { env } from "@/lib/env";
import {
  collectDatabaseMetrics,
  type DatabaseMetrics,
} from "@/lib/monitoring/db-metrics";
import {
  collectStorageMetrics,
  type StorageMetrics,
} from "@/lib/monitoring/storage-metrics";
import { fetchUsageReport, type UsageReport } from "@/lib/monitoring/usage";

export type MonitoringSnapshot = {
  timestamp: string;
  database: DatabaseMetrics;
  storage: StorageMetrics;
  usage: UsageReport;
  thresholds: {
    costUsd: number;
    storageGb: number;
  };
  alerts: string[];
};

/** Collect every metric in parallel and evaluate alert thresholds. */
export async function collectMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  const [database, storage, usage] = await Promise.all([
    collectDatabaseMetrics(),
    collectStorageMetrics(),
    fetchUsageReport(),
  ]);

  const alerts: string[] = [];

  if (!database.ok) {
    alerts.push(`database metrics unavailable: ${database.error ?? "unknown"}`);
  }
  if (database.database.connectionUtilization !== null &&
      database.database.connectionUtilization > 0.8) {
    alerts.push(
      `connection utilization ${(database.database.connectionUtilization * 100).toFixed(1)}% > 80%`,
    );
  }
  if (database.database.cacheHitRatio !== null &&
      database.database.cacheHitRatio < 0.95) {
    alerts.push(
      `cache hit ratio ${(database.database.cacheHitRatio * 100).toFixed(1)}% < 95%`,
    );
  }
  if (database.database.deadlocks !== null && database.database.deadlocks > 0) {
    alerts.push(`deadlocks detected: ${database.database.deadlocks}`);
  }

  if (!storage.ok) {
    alerts.push(`storage metrics unavailable: ${storage.error ?? "unknown"}`);
  }
  if (storage.totalGb > env.STORAGE_ALERT_THRESHOLD_GB) {
    alerts.push(
      `storage ${storage.totalGb} GB > threshold ${env.STORAGE_ALERT_THRESHOLD_GB} GB`,
    );
  }

  if (usage.configured) {
    if (usage.error) alerts.push(`usage API error: ${usage.error}`);
    if (
      usage.cost?.amount !== undefined &&
      usage.cost.amount > env.COST_ALERT_THRESHOLD
    ) {
      alerts.push(
        `estimated cost $${usage.cost.amount} > threshold $${env.COST_ALERT_THRESHOLD}`,
      );
    }
  }

  return {
    timestamp: new Date().toISOString(),
    database,
    storage,
    usage,
    thresholds: {
      costUsd: env.COST_ALERT_THRESHOLD,
      storageGb: env.STORAGE_ALERT_THRESHOLD_GB,
    },
    alerts,
  };
}
