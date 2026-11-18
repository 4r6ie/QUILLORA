# Architecture

## Request flow

1. **Public request** (`/`, `/articles/[slug]`, `/categories/[slug]`, `/tags/[slug]`,
   `/authors/[username]`, index pages):
   - Next.js serves the ISR/CDN-cached response when fresh.
   - On a cache miss or revalidation, the Server Component calls a cached query
     (`unstable_cache`) that reads through `prismaRead`.
   - The query is tagged; a write elsewhere invalidates the tag and the path.

2. **Private request** (`/dashboard/*`, `/admin/*`, `/api/auth/*`, auth pages):
   - Route modules declare `force-dynamic` + `fetchCache = "force-no-store"`.
   - `next.config.ts` adds `Cache-Control: private, no-store` response headers.
   - Guards (`src/lib/security/guards.ts`) verify the Supabase session server-side
     and check roles.

3. **Writes** (server actions + API routes):
   - Validate with zod.
   - Check identity/role.
   - Enforce a rate limit.
   - Write through `prisma` (primary).
   - Append to `audit_logs`.
   - Revalidate affected tags/paths.

## Scaling units

- **Stateless Next.js functions** scale horizontally on Vercel. No in-process
  state except the shared Prisma client (one connection per instance).
- **Postgres** is the scaling bottleneck. Mitigations: indexes, full-text search,
  cursor pagination, read replica seam, pooled connections.
- **Supabase Storage CDN** serves transformed images; `next/image` caches them.
- **Data cache** (Next ISR) absorbs read traffic; stale-while-revalidate keeps
  p95 low during spikes.

## Write-heavy vs read-heavy

| Concern | Path | Cache |
| --- | --- | --- |
| Article feed / search / profiles | `prismaRead` | cached, tagged |
| Article page | `prismaRead` | cached, tagged |
| Create/update/publish/delete | `prisma` | invalidates tags |
| Comments | `prisma` write, `prismaRead` read | comment list cached 60s |
| Views | `prisma` increment | not cached |

## Failure behavior

| Failure | Behavior |
| --- | --- |
| Database slow/unavailable on a public read | `safe()` renders an empty state; no 500. |
| Database unavailable on a write | Error surfaces to the user; nothing is silently dropped. |
| Rate limiter DB failure | Fails open (allows), logs loudly. |
| Upstream timeout | `withTimeout` returns a fallback or typed error. |
| Transient DB error | `retry` with backoff (P1001, P2024, P2034, network, 429/5xx). |
