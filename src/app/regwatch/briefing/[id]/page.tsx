import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ImpactBriefingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title={`Impact briefing · ${id}`}
        description="Claude-generated 4-section briefing following Watershed's template: Headline → Why it matters → Details → What to do now → Deeper resources. Always cited, always exportable with citations preserved. Phase 1."
      />
    </RegwatchAppShell>
  );
}
