# Monitoring, alerting, runbooks

## What is collected

`npm run monitor` and `GET /api/monitor` report:

- **Database**: size, active/max connections, utilization, committed/rolled-back
  transactions, cache hit ratio, deadlocks, per-table row estimates and
  seq/index scans, and the slowest queries from `pg_stat_statements` when the
  extension is enabled.
- **Storage**: objects and bytes per bucket, total GB.
- **Usage/billing**: Supabase project metadata and estimated cost when
  `SUPABASE_MANAGEMENT_API_TOKEN` + `SUPABASE_PROJECT_REF` are set.

## Thresholds and alerts

| Threshold | Default | Alert when |
| --- | --- | --- |
| `COST_ALERT_THRESHOLD` | 50 (USD/month) | estimated cost exceeds it |
| `STORAGE_ALERT_THRESHOLD_GB` | 5 | storage exceeds it |
| connection utilization | 80% | computed in `collectMonitoringSnapshot` |
| cache hit ratio | 95% | computed |
| deadlocks | 0 | computed |

Alerts go to `ALERT_WEBHOOK_URL` as a JSON `{ "text": ... }` payload
(Slack/Discord/Teams-compatible). Without a webhook, alerts are logged.

## Running

```bash
npm run monitor          # DB + storage snapshot
npm run usage            # usage/billing check
# or
curl -H "x-monitor-token: $MONITOR_TOKEN" https://<host>/api/monitor
```

Schedule either script (cron / GitHub Actions / Vercel Cron). Vercel Cron can
call `/api/monitor` with the token.

## Runbooks

**High connection utilization**
1. Check `pg_stat_activity` for idle-in-transaction connections.
2. Confirm the pooler `connection_limit` and `max_connections`.
3. Add a read replica / increase pool size before throttling users.

**Low cache hit ratio**
1. Look at `seq_scan` vs `idx_scan` in the per-table metrics.
2. Add the missing composite index; re-run load tests.

**Slow query**
1. Open `pg_stat_statements` output.
2. `EXPLAIN (ANALYZE, BUFFERS)` the query.
3. Add an index or bound the result set; confirm with k6.

**Rate limiter alert**
1. Check `rate_limit_buckets` growth and add a retention job.
2. If the limiter is failing open, investigate database errors.

**Database down**
1. `/api/health` returns 503.
2. Public pages still render (empty state); writes fail loudly.
3. Restore the database; revalidate with `{"type":"all"}`.
