import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

export const metadata = { title: "Footprint Checkup" };

export default async function CheckupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title="Footprint Checkup."
        description="5–7 question public quiz that outputs a sample Feed (Watershed Regulatory Checkup pattern). Doubles as lead-gen and as the seed footprint for paid signup. Phase 1 (nice-to-have)."
      />
    </RegwatchAppShell>
  );
}
