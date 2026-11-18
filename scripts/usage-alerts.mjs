/**
 * Usage + billing alerts (requirement 18).
 *
 * Fetches Supabase project data and storage utilization, evaluates thresholds,
 * and posts a single alert to ALERT_WEBHOOK_URL. Safe to run on a schedule
 * (cron / GitHub Actions). Without credentials it exits cleanly.
 *
 *   npm run usage
 */
import { loadEnv, withClient, log } from "./lib.mjs";

const COST_THRESHOLD = Number(process.env.COST_ALERT_THRESHOLD ?? 50);
const STORAGE_THRESHOLD_GB = Number(process.env.STORAGE_ALERT_THRESHOLD_GB ?? 5);
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const TOKEN = process.env.SUPABASE_MANAGEMENT_API_TOKEN;

async function storageUsage(client) {
  try {
    const rows = await client.query(`
      SELECT count(*)::bigint AS objects,
             sum((metadata ->> 'size')::bigint) AS bytes
      FROM storage.objects
    `);
    const bytes = Number(rows.rows[0]?.bytes ?? 0);
    return {
      objects: Number(rows.rows[0]?.objects ?? 0),
      totalGb: Number((bytes / 1024 / 1024 / 1024).toFixed(3)),
    };
  } catch {
    return { objects: 0, totalGb: 0, unavailable: true };
  }
}

async function projectUsage() {
  if (!PROJECT_REF || !TOKEN) return { configured: false };

  const headers = { Authorization: `Bearer ${TOKEN}`, apikey: TOKEN };
  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${encodeURIComponent(PROJECT_REF)}`,
      { headers },
    );
    if (!response.ok) {
      return { configured: true, error: `Management API ${response.status}` };
    }
    const project = await response.json();

    let cost;
    try {
      const costResponse = await fetch(
        `https://api.supabase.com/v1/projects/${encodeURIComponent(PROJECT_REF)}/cost`,
        { headers },
      );
      if (costResponse.ok) cost = await costResponse.json();
    } catch {
      // best-effort
    }

    return { configured: true, project, cost };
  } catch (error) {
    return { configured: true, error: String(error) };
  }
}

async function notify(message) {
  const webhook = process.env.ALERT_WEBHOOK_URL;
  if (!webhook) {
    log("usage alert (no webhook):", message);
    return;
  }
  await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}

loadEnv(".env.local");
loadEnv(".env");

const usage = await projectUsage();
const storage = await withClient(storageUsage);

const alerts = [];
if (usage.error) alerts.push(`usage API error: ${usage.error}`);

const estimatedCost = usage.cost?.estimated_cost ?? usage.cost?.amount;
if (typeof estimatedCost === "number" && estimatedCost > COST_THRESHOLD) {
  alerts.push(
    `estimated cost $${estimatedCost} exceeds threshold $${COST_THRESHOLD}`,
  );
}
if (storage.totalGb > STORAGE_THRESHOLD_GB) {
  alerts.push(
    `storage ${storage.totalGb} GB exceeds threshold ${STORAGE_THRESHOLD_GB} GB`,
  );
}

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  configured: usage.configured,
  project: usage.project
    ? { name: usage.project.name, region: usage.project.region }
    : null,
  estimatedCost,
  thresholds: { costUsd: COST_THRESHOLD, storageGb: STORAGE_THRESHOLD_GB },
  storage,
  alerts,
}, null, 2));

if (alerts.length > 0) {
  await notify(`QUILLORA usage/billing alerts:\n- ${alerts.join("\n- ")}`);
  process.exitCode = 2;
}
