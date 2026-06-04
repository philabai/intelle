import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

export const metadata = { title: "Alerts" };

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title="Notification preferences."
        description="Per-saved-feed Daily / Weekly / Off (never Hourly). Channel toggles: In-app (always on), Email (opt-in), Web push (opt-in, CRITICAL only, capped 3 / 24h). Critical-only email gate sends regardless of feed-level frequency. Phase 1."
      />
    </RegwatchAppShell>
  );
}
