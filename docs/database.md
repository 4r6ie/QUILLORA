# Database

## Schema

Models: `Profile`, `Category`, `Tag`, `Article`, `ArticleTag`, `Comment`,
`Bookmark`, `RateLimitBucket`, `AuditLog`. See `prisma/schema.prisma`.

## Indexes (requirement 5)

| Table | Index | Serves |
| --- | --- | --- |
| `articles` | `@@index([status, publishedAt DESC])` | main published feed |
| `articles` | `@@index([authorId, status])` | author dashboard |
| `articles` | `@@index([categoryId, status, publishedAt DESC])` | category feed |
| `articles` | `@@index([publishedAt DESC])` | chronological feed / sitemap |
| `articles` | `@@index([status])` | admin queues |
| `articles` | GIN `to_tsvector(title, excerpt, content)` | full-text search |
| `categories` / `tags` | unique `slug` | lookup |
| `article_tags` | `@@id([articleId, tagId])`, `@@index([tagId, articleId])` | both feed directions |
| `comments` | `@@index([articleId, status, createdAt DESC])` | article discussion |
| `comments` | `@@index([authorId, createdAt DESC])` | user history |
| `rate_limit_buckets` | `@@id([key, windowStart])` | atomic fixed-window counters |
| `audit_logs` | `@@index([entity, entityId])`, `@@index([createdAt DESC])` | moderation history |

The GIN index is created in a migration because Prisma cannot express a
`tsvector` expression index.

## Query patterns

- **Feeds**: `WHERE status='published' AND published_at IS NOT NULL [AND
  category_id = ? | author_id = ?]`, `ORDER BY published_at DESC, id DESC`,
  `LIMIT n+1`. Cursor is `(published_at, id)` so pagination is stable while new
  articles are published.
- **Search**: `to_tsvector @@ plainto_tsquery`, ranked with `ts_rank`, with
  `COUNT(*)` for the total. User input is a bound parameter.
- **Relations without N+1**: articles are fetched with `include` for
  author/category; tags for the whole page are fetched with one
  `articleTag.findMany({ where: { articleId: { in: ids } } })` and grouped in
  memory.
- **Counts**: tag/category counts use a single `groupBy` / `_count`, never one
  query per item.

## Read / write separation (requirement 14, 15)

- `prismaRead` (`src/lib/db/read.ts`) is used by every public read.
- `prisma` (`src/lib/db/client.ts`) is used by every write.
- Set `READ_DATABASE_URL` and all reads move to the replica with no code change.
  Leave it unset and reads use the primary pooler.
- Replication lag means a just-published article may be briefly absent from a
  replica. For read-your-own-writes, the article page is revalidated on publish
  and the author's dashboard reads the primary.

## Connection pooling (requirement 6)

- `DATABASE_URL` uses the Supabase pooler (port 6543, transaction mode) with
  `pgbouncer=true`, which disables prepared statements that the pooler cannot
  support.
- `DIRECT_URL` (port 5432) is used only by `prisma migrate deploy`.
- One `PrismaClient` is reused per serverless instance (cached on `globalThis`
  in development to survive hot reloads).
- `connection_limit=1` in the pooled URL is recommended for serverless.

## Migrations

```bash
npm run db:migrate     # prisma migrate deploy (production)
npm run db:push        # local-only schema sync
```

Add a new migration with `prisma migrate dev --name <change>` when a database is
reachable; never edit applied migration files.
