import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

export const metadata = { title: "Sample Briefings" };

export default async function ExamplesPage() {
  const t = await getTranslations("regwatch.discover");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title={t("examplesComingSoonTitle")}
        description={t("examplesComingSoonDescription")}
      />
    </RegwatchAppShell>
  );
}
