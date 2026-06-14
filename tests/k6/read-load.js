import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

/**
 * HTTP read-load smoke against the public regwatch read paths.
 *
 * NOTE: targets the local Next *dev* instance (:4100), which recompiles and is
 * far slower than a Vercel production deployment — so absolute latency is NOT a
 * capacity number. The signal here is: does the app stay up under concurrency
 * (no 5xx / connection errors), and which endpoints are relatively slowest.
 */
const BASE = __ENV.QA_BASE_URL || "http://localhost:4100";
const errors = new Rate("errors");
const ttfb = new Trend("ttfb_ms");

export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "10s", target: 10 },
        { duration: "20s", target: 25 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    errors: ["rate<0.02"],          // <2% errors
    http_req_failed: ["rate<0.02"],
  },
};

const PATHS = [
  "/en/regwatch/browse",
  "/en/regwatch/regulators",
  "/en/regwatch/topics",
  "/fr/regwatch/browse",
];

export default function () {
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const res = http.get(`${BASE}${path}`, { tags: { path } });
  ttfb.add(res.timings.waiting, { path });
  const ok = check(res, { "status 2xx/3xx": (r) => r.status >= 200 && r.status < 400 });
  errors.add(!ok);
  sleep(0.5 + Math.random());
}
