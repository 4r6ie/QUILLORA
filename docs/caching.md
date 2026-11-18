# Caching

## Layers

1. **CDN / ISR HTML cache** — public routes export `revalidate`:
   - `/` 300s, `/categories` `/tags` `/authors` 600s, `/about` static,
     `/sitemap.xml` 3600s, article/category/tag/author detail pages 300s.
   - Next emits `Cache-Control: s-maxage=<revalidate>, stale-while-revalidate`.
2. **Data cache** — `unstable_cache` wraps every public read with a `revalidate`
   lifetime and a tag from `src/lib/cache/keys.ts`.
3. **Browser cache** — static assets get `public, max-age=31536000, immutable`;
   HTML is not cached by the browser.

## Tags

`articles`, `article:<slug>`, `categories`, `category:<slug>`, `tags`,
`tag:<slug>`, `authors`, `author:<username>`, `home`, `search`.

Writes call `revalidateArticle` / `revalidateCategory` / `revalidateTagEntity` /
`revalidateAuthor` / `revalidateComments`, which invalidate both tags (data) and
paths (HTML/RSC). Next 16 requires the cache-life profile on `revalidateTag`;
`src/lib/cache/revalidate.ts` passes `"max"` for stale-while-revalidate.

## On-demand revalidation API

```bash
curl -X POST https://<host>/api/revalidate \
  -H 'content-type: application/json' \
  -H "x-revalidate-secret: $REVALIDATE_SECRET" \
  -d '{"type":"article","slug":"my-story"}'
```

Payload types: `article`, `category`, `tag`, `author`, `article-comments`, `all`.

Wire a Supabase webhook / Realtime listener / cron to this endpoint for external
change sources.

## Private surfaces (never cached)

- `(auth)/*`, `/dashboard/*`, `/admin/*`, `/api/auth/*`, `/api/account/*`.
- Route modules: `export const dynamic = "force-dynamic"` and
  `export const fetchCache = "force-no-store"`.
- `next.config.ts` headers: `Cache-Control: private, no-cache, no-store,
  max-age=0, must-revalidate` + `Pragma: no-cache` + `Expires: 0`.

## Image caching

`next/image` is configured with `minimumCacheTTL: 60`, AVIF/WebP formats, and
device sizes. The loader calls Supabase Storage's `render/image` endpoint, which
resizes at the edge; the resulting response is cached by the CDN.
