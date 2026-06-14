import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegwatchLoginForm } from "./LoginForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadataRw" });
  return { title: t("login.title") };
}

export default async function RegwatchLoginPage() {
  const t = await getTranslations("regwatch.auth");
  return (
    <RegwatchAppShell authed={false}>
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("signInTitle")}</h1>
          <p className="mt-2 text-sm text-muted">
            {t("signInSubtitle")}
          </p>
        </div>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-md bg-card-bg" />}>
          <RegwatchLoginForm />
        </Suspense>
        <p className="text-sm text-muted">
          {t("newToVantage")}{" "}
          <Link href="/regwatch/signup" className="text-brand-teal hover:underline">
            {t("createAccountLink")}
          </Link>
          .
        </p>
      </div>
    </RegwatchAppShell>
  );
}
