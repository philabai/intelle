import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title={`Topic · ${slug}`}
        description="Per-topic aggregation for curated topics (CBAM, PFAS, MARPOL Annex VI, GCC LNG Bunkering, methane, process safety). Pre-configured topical feeds users can one-click subscribe to (EUR-Lex predefined RSS pattern). Phase 1 (should-have)."
      />
    </RegwatchAppShell>
  );
}
