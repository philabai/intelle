import { localizedRedirect } from "@/i18n/redirect";
import { createClient } from "@/lib/regwatch/supabase/server";

/**
 * Monitor hub landing — redirects to /monitor/today (the relevance
 * feed, the daily-use surface). Unauthed users redirect to the public
 * Discover landing instead.
 *
 * The actual landing content lives under /monitor/today so adding
 * sub-tabs later (recap, saved, alerts) is a flat sibling-route
 * addition.
 */
export const dynamic = "force-dynamic";

export default async function MonitorRoot() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/discover");
  return localizedRedirect("/regwatch/monitor/today");
}
