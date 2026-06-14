import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegwatchSignupForm } from "./SignupForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadataRw" });
  return { title: t("signup.title") };
}

export default async function RegwatchSignupPage() {
  const t = await getTranslations("regwatch.auth");
  return (
    <RegwatchAppShell authed={false}>
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("signUpTitle")}</h1>
          <p className="mt-2 text-sm text-muted">
            {t("signUpSubtitle")}
          </p>
        </div>
        <RegwatchSignupForm />
        <p className="text-sm text-muted">
          {t("haveAccount")}{" "}
          <Link href="/regwatch/login" className="text-brand-teal hover:underline">
            {t("signInBtn")}
          </Link>
          .
        </p>
      </div>
    </RegwatchAppShell>
  );
}
