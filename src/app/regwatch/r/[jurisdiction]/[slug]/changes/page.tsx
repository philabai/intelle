import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

interface Props {
  params: Promise<{ jurisdiction: string; slug: string }>;
}

export default async function RegulationChangesPage({ params }: Props) {
  const { jurisdiction, slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title={`Changes — ${jurisdiction.toUpperCase()} · ${slug}`}
        description="Lifecycle timeline + amendment history (Enhesa Forecaster + LexisNexis Horizon Scanning pattern). Phase 1."
      />
    </RegwatchAppShell>
  );
}
