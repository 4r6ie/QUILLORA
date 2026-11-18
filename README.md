# QUILLORA

A digital publishing platform built to grow from a single-author blog into a
high-traffic publication. Next.js 16 (App Router) + Supabase (Postgres, Auth,
Storage) + Prisma + Vercel.

> Status: reference implementation. Every scalability requirement is backed by
> code, configuration, or a script in this repository — and the load-test
> results in `docs/load-testing.md` come from actually running k6, not from
> estimates.

## Quick start

```bash
npm install
cp .env.example .env.local      # fill in Supabase + DATABASE_URL
npm run db:generate             # generate the Prisma client
npm run db:migrate              # apply migrations (needs DIRECT_URL)
npm run db:seed                 # optional demo content
npm run dev
```

Open http://localhost:3000.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development / production |
| `npm run lint` / `typecheck` / `test` | ESLint / `tsc --noEmit` / vitest |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Apply migrations with `prisma migrate deploy` |
| `npm run db:push` | Sync schema without migrations (local only) |
| `npm run db:seed` | Seed categories, tags, authors, articles |
| `npm run monitor` | Print DB/storage metrics and evaluate thresholds |
| `npm run usage` | Usage + billing alert check |
| `npm run load:smoke` | k6 smoke test |
| `npm run load:stress` | k6 ramp/stress test |

## Architecture in one page

```
   Reader  ───────▶  Vercel Edge / Next.js ISR  (CDN cache, s-maxage)
                            │  public: /, /articles/[slug], /categories, /tags, /authors
                            │ on-demand revalidate
                            ▼
                    Server Components / Routes  (force-dynamic + no-store)
                            │  private: /dashboard, /admin, /api/auth
                            │ Prisma
                            ▼
                    Supabase pooler (pgBouncer)  ◀── optional read replica
                            │
                            ▼
                    PostgreSQL (Supabase)
```

- **Reads** go through `prismaRead` (`src/lib/db/read.ts`) → replica when
  `READ_DATABASE_URL` is set, otherwise the primary pooler.
- **Writes** go through `prisma` (`src/lib/db/client.ts`) → primary only.
- **Caching** uses `unstable_cache` with tags for data, `revalidate` for ISR on
  HTML, and `revalidateTag`/`revalidatePath` for on-demand invalidation.
- **Images** are stored in Supabase Storage and rendered through the Storage
  CDN's `render/image` endpoint + `next/image`.

## Environment

See `.env.example`. The important ones:

| Variable | Why |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Browser client (public). |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin operations. Never ship it. |
| `DATABASE_URL` | Pooled connection (port 6543, `pgbouncer=true`). |
| `DIRECT_URL` | Direct connection (port 5432) for migrations only. |
| `READ_DATABASE_URL` | Optional read replica; reads move there automatically. |
| `REVALIDATE_SECRET` | Shared secret for `POST /api/revalidate`. |
| `MONITOR_TOKEN` | Token for `GET /api/monitor`. |
| `SUPABASE_MANAGEMENT_API_TOKEN` / `SUPABASE_PROJECT_REF` | Billing/usage alerts. |
| `ALERT_WEBHOOK_URL` | Slack/Discord/Teams webhook for alerts. |
| `COST_ALERT_THRESHOLD` / `STORAGE_ALERT_THRESHOLD_GB` | Alert thresholds. |

## Requirement checklist

Each of the 18 requirements is implemented and mapped in
[`docs/requirements-map.md`](docs/requirements-map.md). Highlights:

1. ISR + CDN caching on public routes (`export const revalidate`, `unstable_cache`).
2. Cached articles, categories, tags, and public author profiles.
3. On-demand revalidation from server actions and `POST /api/revalidate`.
4. Private routes are `force-dynamic` + `no-store`, plus response headers.
5. Composite/partial indexes + a GIN full-text index (see `prisma/migrations`).
6. Supabase pooler + `pgbouncer=true`; `directUrl` for migrations.
7. Relations loaded in a constant number of queries (never N+1).
8. Cursor pagination for feeds, page pagination for search; bounded limits.
9. Supabase Storage render endpoint + `next/image` optimization.
10. Postgres-backed rate limiting for auth, comments, search, submissions.
11. Timeouts, retries with backoff, typed errors, error boundaries.
12. `npm run monitor` + `GET /api/monitor` for DB metrics and slow queries.
13. `vercel.json` pins functions to a Supabase-adjacent region (`sin1`).
14. Read and write paths are separate modules and separate clients.
15. `READ_DATABASE_URL` routes all reads to a replica with zero code changes.
16. k6 scripts under `tests/load/`.
17. Real load-test results and bottleneck notes in `docs/load-testing.md`.
18. Usage/billing alert script + thresholds.

## Load testing

```bash
npm run build && npm run start &   # serve the production build
npm run load:smoke
npm run load:stress
k6 run tests/load/api.js
k6 run tests/load/bottleneck.js
```

## License

MIT.
