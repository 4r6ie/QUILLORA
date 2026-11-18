# Scalability & reliability

## Growth path

1. **Single small deployment** — one Vercel project, one Supabase project,
   pooled connections, ISR + data cache. This is the starting point.
2. **Read-heavy growth** — enable `READ_DATABASE_URL` to add a Supabase read
   replica; all public reads move automatically.
3. **Write-heavy growth** — move comments/views to a separate service or queue;
   the write path is already isolated from reads.
4. **Global growth** — pin Vercel functions to the Supabase region; use the
   Supabase CDN for images; add a dedicated Redis rate limiter if Postgres
   counters become hot.
5. **Very large scale** — shard by tenant/publication; the schema keeps
   `author_id` and `category_id` as natural partition keys.

## Horizontal scaling

- Next.js functions are stateless. Any instance can serve any request.
- No in-memory caches that would be wrong across instances (rate limiting is in
  Postgres; the Next data cache is per-deployment and invalidated by tags).
- `vercel.json` sets `regions` so functions run close to the database.

## Region mapping (requirement 13)

| Supabase region | Vercel region |
| --- | --- |
| `ap-southeast-1` (Singapore) | `sin1` |
| `ap-northeast-1` (Tokyo) | `hnd1` |
| `us-east-1` (N. Virginia) | `iad1` |
| `eu-west-1` (Ireland) | `lhr1` |

The repository ships `sin1`; change `vercel.json` to match your project.

## Graceful degradation

- Public reads fall back to an empty state; the page still returns 200.
- Rate limiting fails open.
- Writes never partially apply: mutations use a single create/update (and tag
  sync in the same request); a failed mutation throws and nothing is silently
  discarded.
- Timeouts bound every external probe; retries cover transient failures.
- Health endpoint returns 503 when the database is down so orchestration can
  react.

## Cost controls (requirement 18)

- Bounded page sizes (`MAX_PAGE_SIZE = 50`, search limit 50) cap query cost.
- `max_rows` on the Supabase API limits PostgREST payloads.
- `npm run usage` compares estimated cost and storage to thresholds and posts to
  a webhook.
- `npm run monitor` surfaces connection utilization, cache hit ratio, deadlocks,
  and slow queries before they become bills.
