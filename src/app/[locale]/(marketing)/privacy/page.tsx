import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy | intelle.io",
  description:
    "intelle.io privacy policy: how we collect, use, and protect personal data. Compliant with GDPR, UAE PDPL, and India DPDP. Last updated April 2026.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default async function PrivacyPage() {
  const t = await getTranslations("privacyPage");
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-invert prose-sm max-w-none">
        <h1>{t("title")}</h1>
        <p className="text-muted">{t("lastUpdated")}</p>
        <p>{t("intro", { entity: SITE.legalEntity, name: SITE.name })}</p>

        <h2>{t("collectTitle")}</h2>
        <p>{t("collectBody")}</p>

        <h2>{t("useTitle")}</h2>
        <ul>
          <li>{t("use1")}</li>
          <li>{t("use2")}</li>
          <li>{t("use3")}</li>
          <li>{t("use4")}</li>
        </ul>

        <h2>{t("retentionTitle")}</h2>
        <p>{t("retentionBody")}</p>

        <h2>{t("securityTitle")}</h2>
        <p>{t("securityBody")}</p>

        <h2>{t("rightsTitle")}</h2>
        <p>{t("rightsBody", { email: SITE.email })}</p>

        <h2>{t("thirdPartyTitle")}</h2>
        <p>{t("thirdPartyBody")}</p>

        <h2>{t("changesTitle")}</h2>
        <p>{t("changesBody")}</p>

        <h2>{t("contactTitle")}</h2>
        <p>{t("contactBody", { email: SITE.email, phone: SITE.phone.dubai })}</p>
        <p>
          {SITE.legalEntity}
          <br />
          {SITE.locations.primary}
        </p>
      </div>
    </section>
  );
}
