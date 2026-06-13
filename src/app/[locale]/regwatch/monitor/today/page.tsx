import { localizedRedirect } from "@/i18n/redirect";

/**
 * /monitor/today — the canonical daily-use surface. v1 just redirects
 * to the existing /feed page so we don't have to clone its (substantial)
 * relevance-feed + deadlines-strip + bulk-triage UI. PR-G moves the
 * implementation under /monitor/today and 301s the old /feed path.
 */
export default async function MonitorToday() {
  return localizedRedirect("/regwatch/feed");
}
