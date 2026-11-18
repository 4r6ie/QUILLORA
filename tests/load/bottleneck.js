// Bottleneck probe: hammer one hot article and one search term concurrently.
// The goal is to identify whether the limit is the DB, the cache, or the
// function runtime — not to assert a capacity number.
// Usage: k6 run tests/load/bottleneck.js
import http from "k6/http";
import { check, sleep } from "k6";

import { BASE, ARTICLE_SLUGS } from "./lib.js";

const HOT_SLUG = __ENV.HOT_SLUG || ARTICLE_SLUGS[0];
const SEARCH_TERM = __ENV.SEARCH_TERM || "database";

export const options = {
  scenarios: {
    hotArticle: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 200 },
        { duration: "40s", target: 200 },
        { duration: "20s", target: 0 },
      ],
      exec: "hotArticle",
      tags: { probe: "hot-article" },
    },
    search: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 100 },
        { duration: "40s", target: 100 },
        { duration: "20s", target: 0 },
      ],
      exec: "search",
      tags: { probe: "search" },
    },
  },
  thresholds: {
    "http_req_duration{probe:hot-article}": ["p(95)<1000"],
    "http_req_duration{probe:search}": ["p(95)<2000"],
  },
};

export function hotArticle() {
  const response = http.get(`${BASE}/articles/${HOT_SLUG}`);
  check(response, { "hot article 200": (r) => r.status === 200 });
  sleep(0.2);
}

export function search() {
  const response = http.get(`${BASE}/api/search?q=${encodeURIComponent(SEARCH_TERM)}`);
  check(response, { "search 200 or 429": (r) => r.status === 200 || r.status === 429 });
  sleep(0.5);
}
