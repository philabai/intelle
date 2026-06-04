import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

export const metadata = { title: "Relevance Feed" };

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title="Your Relevance Feed."
        description="Footprint-scored regulatory items in the last 7 days, sticky 30 / 60 / 90 deadline strip, dense rows with a coloured footprint chip on every item. Lights up in Phase 1 once connectors and the matching pipeline are running."
      />
    </RegwatchAppShell>
  );
}
