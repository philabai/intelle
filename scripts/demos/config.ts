import { readFileSync } from "node:fs";

/**
 * Shared config for the demo-video tooling (seed + record).
 *
 * The demo account is an ISOLATED, dedicated org ("Northwind Energy") with no
 * real data — separate from any real customer org. The password lives here for
 * reproducibility (private repo, throwaway account); override with
 * DEMO_USER_PASSWORD in the environment if you prefer.
 */

// Load .env.local into process.env for standalone tsx runs.
export function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      )
        v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch {
    /* optional */
  }
}

export const DEMO = {
  baseUrl: process.env.DEMO_BASE_URL ?? "http://localhost:4000",
  email: process.env.DEMO_USER_EMAIL ?? "demo@intelle.io",
  password: process.env.DEMO_USER_PASSWORD ?? "Northwind-Demo-2026!",
  orgName: "Northwind Energy",
  firstName: "Alex",
  lastName: "Rivera",
  // 16:9 — good for desktop site + sharing.
  viewport: { width: 1600, height: 900 },
  outDir: "scripts/demos/out",
  // Pacing (ms) — tuned so captions are readable on playback.
  pace: {
    caption: 1500,
    afterClick: 1100,
    afterNav: 1600,
    cursorMove: 700,
    titleCard: 2600,
    typeDelay: 55,
  },
} as const;
