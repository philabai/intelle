import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getMyAlertPrefs } from "@/lib/regwatch/alerts";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { AlertPrefsForm } from "@/components/regwatch/alerts/AlertPrefsForm";

export const metadata = { title: "Alerts" };
export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/regwatch/login?next=/regwatch/settings/alerts");

  const initial = await getMyAlertPrefs();

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            My Feed
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Alerts</span>
        </nav>

        <header className="mt-4 mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            Notifications
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
            Alert preferences
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Three channels: in-app bell (always on), email digests (opt-in, weekly or
            daily), and browser push for critical-severity items (opt-in, capped at
            3 / 24h). No hourly option — research is clear that hourly compliance email
            becomes inbox noise within a week.
          </p>
        </header>

        <AlertPrefsForm initial={initial} />
      </div>
    </RegwatchAppShell>
  );
}
