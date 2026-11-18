# Requirement → implementation map

| # | Requirement | Implementation |
| --- | --- | --- |
| 1 | Next.js CDN caching + ISR for public articles | `export const revalidate` on public routes; `unstable_cache` data cache in `src/features/**/queries.ts`; CDN `Cache-Control` via Next ISR. |
| 2 | Cache published articles, categories, tags, public author profiles | Cached reads: `getPublishedArticleDetail`, `getPublishedArticleBySlug`, `getPublishedArticles`, `getCategories`, `getTags`, `getAuthorByUsername`, `getAuthors`, `getArticleComments`. |
| 3 | On-demand revalidation on approve / update / unpublish / delete | `src/lib/cache/revalidate.ts`; called from `src/features/articles/mutations.ts` and exposed at `POST /api/revalidate` (`x-revalidate-secret`). |
| 4 | Never cache private dashboards/auth/PII/admin | `export const dynamic = "force-dynamic"` + `fetchCache = "force-no-store"` on `/dashboard`, `/admin`, `(auth)`; `next.config.ts` `headers()` adds `Cache-Control: private, no-store` for those paths and `/api/auth`. |
| 5 | Optimized PostgreSQL queries + indexes | `prisma/schema.prisma` indexes; migrations add a GIN `to_tsvector` index; search uses `plainto_tsquery` with `LIMIT/OFFSET`. |
| 6 | Supabase connection pooling + Prisma serverless | `DATABASE_URL` points at the pooler with `pgbouncer=true`; `DIRECT_URL` reserved for migrations; single shared `PrismaClient`. |
| 7 | Prevent N+1 | `attachTags()` loads all tags for a page in one query; `include` for author/category; relation counts via one `groupBy`. |
| 8 | Pagination, never load whole collections | Cursor pagination (`src/lib/pagination.ts`) for feeds/authors/categories/tags/comments; page pagination for search; `take: limit + 1`; `max_rows` enforced in API. |
| 9 | Supabase Storage + next/image | `src/lib/supabase/storage.ts` render endpoint; `SupabaseImage` component; `images.remotePatterns` + `minimumCacheTTL`. |
| 10 | Rate limiting: auth, comments, search, submissions | `src/lib/rate-limit/index.ts` presets; applied in `features/auth/actions.ts`, `POST /api/comments`, `GET /api/search`, `POST /api/articles`, and article server actions. |
| 11 | Timeouts, graceful errors, retries | `withTimeout`, `retry` (exponential backoff + jitter), typed `AppError`, `error.tsx`/`global-error.tsx`/`not-found.tsx`, `safe()` fallbacks on public pages. |
| 12 | Monitor DB CPU/memory/connections/storage/query perf | `src/lib/monitoring/db-metrics.ts` (pg_stat_*), `storage-metrics.ts`, `GET /api/monitor`, `scripts/monitor.mjs`. |
| 13 | Vercel functions close to Supabase region | `vercel.json` `"regions": ["sin1"]`; document the mapping to Supabase `ap-southeast-1`. |
| 14 | Separate read-heavy and write-heavy operations | Reads in `features/*/queries.ts` via `prismaRead`; writes in `features/*/mutations.ts` via `prisma`; `AuditLog` for write actions. |
| 15 | Optional read replicas | `src/lib/db/read.ts`: when `READ_DATABASE_URL` is set every read uses it; unset = primary. |
| 16 | Automated performance/load testing with k6 | `tests/load/{smoke,stress,api,bottleneck}.js`; `npm run load:smoke|load:stress`. |
| 17 | Realistic concurrent traffic + bottleneck identification | k6 scenarios + `docs/load-testing.md` with measured results. |
| 18 | Usage monitoring + billing alerts | `scripts/usage-alerts.mjs`, `scripts/monitor.mjs`, thresholds in env, webhook alerts. |

## Explicit non-claims

- No concurrent-user capacity is claimed without a load test. `docs/load-testing.md`
  records the actual environment, script, and numbers, and labels them as
  observations from that run.
- The system is designed to degrade: public pages render an empty state if the
  database is unavailable; writes fail loudly rather than being silently dropped;
  rate limiting fails open so it cannot lose user data.
