import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function RegulatorPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title={`Regulator · ${slug}`}
        description="Per-regulator profile aggregation (Federal Register agency-pages pattern): bio, latest publications, contact points, 'Subscribe to this regulator' button. Phase 1 (should-have)."
      />
    </RegwatchAppShell>
  );
}
