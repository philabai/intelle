import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

export const metadata = { title: "MEA Energy Recap" };

export default async function RecapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title="Weekly MEA Energy Regulatory Recap."
        description="Ungated weekly content (RegTrail + Watershed monthly-digest pattern). SEO + lead generation. Opt-in subscribe via Brevo only on explicit click — never a broadcast. Phase 1 (nice-to-have)."
      />
    </RegwatchAppShell>
  );
}
