import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

interface Props {
  params: Promise<{ jurisdiction: string; slug: string }>;
}

export default async function RegulationChangesPage({ params }: Props) {
  const t = await getTranslations("regwatch.discover");
  const { jurisdiction, slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title={t("changesComingSoonTitle", {
          jurisdiction: jurisdiction.toUpperCase(),
          slug,
        })}
        description={t("changesComingSoonDescription")}
      />
    </RegwatchAppShell>
  );
}
