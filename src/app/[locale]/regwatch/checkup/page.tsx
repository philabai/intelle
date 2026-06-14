import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { createClient } from "@/lib/regwatch/supabase/server";
import { RegwatchAppShell, RegwatchComingSoon } from "@/components/regwatch/AppShell";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadataRw" });
  return { title: t("checkup.title") };
}

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
