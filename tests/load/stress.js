/* eslint-disable import/no-anonymous-default-export */
// Stress test: ramp traffic to find the knee where latency or error rate
// degrades. Results are observations, not capacity guarantees.
// Usage: k6 run tests/load/stress.js
import http from "k6/http";
import { check, sleep } from "k6";

import { BASE, PUBLIC_PATHS, ARTICLE_SLUGS, pick } from "./lib.js";

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 150 },
    { duration: "1m", target: 300 },
    { duration: "30s", target: 150 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  const path = Math.random() < 0.4 ? `/articles/${pick(ARTICLE_SLUGS)}` : pick(PUBLIC_PATHS);
  const response = http.get(`${BASE}${path}`, { tags: { page: path.split("/")[1] || "home" } });
  check(response, { "status is 200 or 404": (r) => r.status === 200 || r.status === 404 });
  sleep(0.5);
}
