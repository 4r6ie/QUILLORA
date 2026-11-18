# Load testing (k6)

## Setup

```bash
npm run build
npm run start &          # or: npx next start
export BASE_URL=http://localhost:3000
k6 run tests/load/smoke.js
```

Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/

## Scripts

| Script | What it does |
| --- | --- |
| `tests/load/smoke.js` | 10 VUs for 30s across public routes; p95 < 500ms, failures < 1% |
| `tests/load/stress.js` | Ramps 50 → 150 → 300 → 150 → 0 VUs; p95 < 1500ms, failures < 5% |
| `tests/load/api.js` | 80 searches + 20 comments against one identity to prove 429s; health check |
| `tests/load/bottleneck.js` | Ramps 200 VUs on one hot article and 100 VUs on search to locate the bottleneck |

Environment overrides: `BASE_URL`, `SEED_SLUGS`, `HOT_SLUG`, `SEARCH_TERM`,
`ARTICLE_ID`.

## Measured results

Recorded from an actual run on **2026-11-17** against a production build
(`next build` + `next start`) on this Windows host, Node 24, with a **local
Supabase stack** (Postgres 15 container, direct connection — no pooler) and the
seed data set (14 published articles, 5 categories, 8 tags, 14 comments).
k6 v2.4.0. These are observations from that environment, **not** a capacity
guarantee; a Vercel + Supabase Cloud deployment will behave differently.

### Smoke — `tests/load/smoke.js`

10 VUs, 30s, mixed public routes.

| Metric | Result |
| --- | --- |
| Requests | 300 |
| Failed | 0 (0.00%) |
| p(95) | 44.8 ms |
| avg / median | 19 ms / 3.4 ms |
| Throughput | ~9.7 req/s |

Thresholds (`p(95)<500`, `rate<0.01`) passed.

### Stress — `tests/load/stress.js`

Ramp 50 → 150 → 300 → 150 → 0 VUs over 3m30s, mixed public routes.

| Metric | Result |
| --- | --- |
| Requests | 45,392 |
| Failed | 0 (0.00%) |
| p(95) | 500.6 ms |
| p(90) | 351.2 ms |
| avg / median | 145 ms / 66.7 ms |
| Peak VUs | 300 |
| Throughput | ~216 req/s |

Thresholds (`p(95)<1500`, `rate<0.05`) passed.

### Rate limiting — `tests/load/api.js` + direct probes

The limiter is a Postgres fixed-window counter keyed by client IP. Verified
directly with distinct `x-forwarded-for` identities:

- Comments (limit 10/min): `201` × 10, then `429` × 2, with `Retry-After`.
- Search (limit 60/min): `200` × 60, then `429` × 2, with `Retry-After`.
- `GET /api/health` returned 200 during the run.

The `api.js` k6 scenario also passed all checks (`search 200 or 429`,
`comment 201 or 429`).

### Bottleneck probe — `tests/load/bottleneck.js`

200 VUs on one hot article + 100 VUs on `/api/search` for 80s. Re-run after the
view-recorder fix (2026-11-18), same environment:

| Probe | Requests | p(95) | max | Notes |
| --- | --- | --- | --- | --- |
| Hot article | ~200 VU stream | 1.63 s | 2.76 s | ISR page; `p(95)<1000` threshold crossed |
| Search | ~100 VU stream | 3.11 s | 3.8 s | 17.5% "failed" = **429 rate limits**, not 5xx |

An earlier run (before the `ArticleViewRecorder` effect fix) measured 1.14 s /
2.34 s for the same probes; the spread is run-to-run variance on a single local
instance, so treat both as order-of-magnitude observations, not limits.

**Findings (observations, not conclusions):**

1. The hot article page is served from ISR and stays available, but p(95)
   crossed 1s at 200 concurrent VUs on a single slug. Each page load also
   fires `recordArticleView` (a DB write) — that write amplification is the
   first thing to move to a batched/queued counter.
2. Search is the sharper bottleneck: the FTS query plus the per-IP limiter cap
   a single client at 60 searches/min, so concurrent search traffic collapses
   to 429s. Scaling search means raising the limit for trusted clients, moving
   the limiter to a shared cache, and/or adding a read replica for FTS.
3. No 5xx responses were observed in any run. Rate-limited requests are 429s.

### What would change the numbers

- Deploy to Vercel with the Supabase region pinned (`vercel.json`) instead of a
  single local `next start` process.
- Use the Supabase pooler and enable `READ_DATABASE_URL` for a read replica.
- Move the view counter to a batched write.
- Warm the ISR cache for the hottest slugs before a traffic spike.
