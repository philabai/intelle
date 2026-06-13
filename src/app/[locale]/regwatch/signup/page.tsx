import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { RegwatchSignupForm } from "./SignupForm";

export const metadata = { title: "Create your Vantage account" };

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
