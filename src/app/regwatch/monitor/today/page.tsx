import { redirect } from "next/navigation";

/**
 * /monitor/today — the canonical daily-use surface. v1 just redirects
 * to the existing /feed page so we don't have to clone its (substantial)
 * relevance-feed + deadlines-strip + bulk-triage UI. PR-G moves the
 * implementation under /monitor/today and 301s the old /feed path.
 */
export default function MonitorToday() {
  redirect("/regwatch/feed");
}
