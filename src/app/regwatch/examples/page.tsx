import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

export const metadata = { title: "Sample Briefings" };

export default async function ExamplesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title="Sample impact briefings."
        description="Public, indexed gallery of sample impact briefings and Iris queries (Lexis+ Protégé Prompt Library pattern). SEO + trust signal — no signup required. Phase 1 (should-have)."
      />
    </RegwatchAppShell>
  );
}
