/* eslint-disable import/no-anonymous-default-export */
// API tests: verify rate limiting and graceful degradation.
// Usage: k6 run tests/load/api.js
import http from "k6/http";
import { check, sleep } from "k6";

import { BASE } from "./lib.js";

export const options = {
  scenarios: {
    search: {
      executor: "per-vu-iterations",
      vus: 1,
      iterations: 80,
      startTime: "0s",
      tags: { endpoint: "search" },
    },
    comments: {
      executor: "per-vu-iterations",
      vus: 1,
      iterations: 20,
      startTime: "5s",
      tags: { endpoint: "comments" },
    },
    health: {
      executor: "constant-vus",
      vus: 5,
      duration: "20s",
      startTime: "0s",
      tags: { endpoint: "health" },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
  },
};

const ARTICLE_ID = __ENV.ARTICLE_ID || "";

export default function () {
  const endpoint = exec.scenario.name;

  if (endpoint === "search") {
    const response = http.get(`${BASE}/api/search?q=postgres`);
    check(response, {
      "search 200 or 429": (r) => r.status === 200 || r.status === 429,
      "429 has retry-after": (r) => r.status !== 429 || Boolean(r.headers["Retry-After"]),
    });
    return;
  }

  if (endpoint === "comments") {
    const payload = JSON.stringify({
      articleId: ARTICLE_ID,
      content: "Load test comment",
      authorName: "k6",
    });
    const response = http.post(`${BASE}/api/comments`, payload, {
      headers: { "content-type": "application/json" },
    });
    check(response, {
      "comment 201 or 429": (r) => r.status === 201 || r.status === 429,
    });
    return;
  }

  const response = http.get(`${BASE}/api/health`);
  check(response, { "health 200 or 503": (r) => r.status === 200 || r.status === 503 });
  sleep(1);
}
