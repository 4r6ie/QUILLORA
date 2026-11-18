/* eslint-disable import/no-anonymous-default-export */
// Smoke test: low, steady traffic across the public surfaces.
// Usage: k6 run tests/load/smoke.js
import http from "k6/http";
import { check, sleep } from "k6";

import { BASE, PUBLIC_PATHS, ARTICLE_SLUGS, pick } from "./lib.js";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const path = Math.random() < 0.35 ? `/articles/${pick(ARTICLE_SLUGS)}` : pick(PUBLIC_PATHS);
  const response = http.get(`${BASE}${path}`, {
    headers: { "accept": "text/html" },
    tags: { page: path.split("/")[1] || "home" },
  });

  check(response, {
    "status is 200": (r) => r.status === 200,
    "content-type is html": (r) => String(r.headers["Content-Type"]).includes("text/html"),
  });

  sleep(1);
}
