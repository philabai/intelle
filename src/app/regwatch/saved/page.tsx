import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

export const metadata = { title: "My Vantage" };

export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title="My Vantage"
        description="Saved searches, saved regulations, saved Feed views, past impact briefings — one panel, typed tabs (EUR-Lex My-EUR-Lex + Federal Register MyFR pattern). Phase 1."
      />
    </RegwatchAppShell>
  );
}
