import { getTranslations } from "next-intl/server";
import { localizedRedirect } from "@/i18n/redirect";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getDashboardData } from "@/lib/regwatch/dashboard-queries";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { DashboardView } from "@/components/regwatch/dashboard/DashboardView";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const t = await getTranslations("regwatch.dashboardPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/dashboard");

  const data = await getDashboardData();
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {today}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {data.orgName}
          </h1>
          <p className="mt-2 text-sm text-muted">{t("subtitle")}</p>
        </header>
        <DashboardView data={data} />
      </div>
    </RegwatchAppShell>
  );
}
