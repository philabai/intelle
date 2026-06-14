import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

export const metadata = { title: "Footprint Checkup" };

export default async function CheckupPage() {
  const t = await getTranslations("regwatch.discover");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <RegwatchAppShell authed={!!user}>
      <RegwatchComingSoon
        title={t("checkupComingSoonTitle")}
        description={t("checkupComingSoonDescription")}
      />
    </RegwatchAppShell>
  );
}
