// Shared helpers for k6 load tests.
export const BASE = __ENV.BASE_URL || "http://localhost:3000";

// Slugs seeded by scripts/seed.mjs. Override with SEED_SLUGS (comma separated).
const slugEnv = __ENV.SEED_SLUGS || "";
export const ARTICLE_SLUGS = slugEnv
  ? slugEnv.split(",").map((slug) => slug.trim()).filter(Boolean)
  : [
      "caching-that-actually-scales",
      "postgres-indexes-for-editorial-workloads",
      "the-hidden-cost-of-n-plus-one",
      "rate-limiting-without-redis",
      "reading-replicas-when-and-why",
    ];

export const PUBLIC_PATHS = [
  "/",
  "/explore",
  "/categories",
  "/tags",
  "/authors",
  "/about",
  "/categories/technology",
  "/tags/performance",
  "/authors/ada",
];

export function articleUrl(slug) {
  return `${BASE}/articles/${slug}`;
}

export function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function metricsNames() {
  return {
    httpReqDuration: "http_req_duration",
    httpReqFailed: "http_req_failed",
  };
}
