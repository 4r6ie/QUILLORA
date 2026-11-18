/**
 * Cache tag registry (requirements 1-3).
 *
 * Every cached read is tagged here. Writes call the matching tag(s) so the
 * CDN/ISR cache is invalidated the moment content changes.
 */
export const cacheTags = {
  /** All published-article feeds (home, explore, category, author, sitemap). */
  articles: "articles",
  /** A single article. */
  article: (slug: string) => `article:${slug}`,
  /** All category listings. */
  categories: "categories",
  category: (slug: string) => `category:${slug}`,
  /** All tag listings. */
  tags: "tags",
  tag: (slug: string) => `tag:${slug}`,
  /** All public author profiles. */
  authors: "authors",
  author: (username: string) => `author:${username}`,
  /** Home page aggregate. */
  home: "home",
  /** Search results. */
  search: "search",
} as const;

/** Cache lifetimes (seconds) for time-based ISR. */
export const cacheTimes = {
  /** Public article pages: 5 minutes, then stale-while-revalidate. */
  article: 300,
  /** Feeds and listings: 2 minutes. */
  feed: 120,
  /** Taxonomies and profiles: 10 minutes. */
  taxonomy: 600,
  /** Search: 30 seconds (fast-moving, low value to cache). */
  search: 30,
} as const;
