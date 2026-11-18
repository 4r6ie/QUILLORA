-- Full-text search index (requirement 5).
-- Expression matches src/features/search/queries.ts exactly.
CREATE INDEX IF NOT EXISTS articles_search_idx
ON articles
USING GIN (
  to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(excerpt, '') || ' ' ||
    coalesce(content, '')
  )
);

-- Optional: enables the slow-query metrics in scripts/monitor.mjs.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
