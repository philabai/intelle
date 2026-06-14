import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SITE } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("terms.title"),
    description: t("terms.description"),
    alternates: { canonical: "/terms" },
    robots: { index: true, follow: true },
  };
}

export default async function TermsPage() {
  const t = await getTranslations("termsPage");
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-invert prose-sm max-w-none">
        <h1>{t("title")}</h1>
        <p className="text-muted">{t("lastUpdated")}</p>
        <p>{t("intro", { name: SITE.name, entity: SITE.legalEntity })}</p>

        <h2>{t("useTitle")}</h2>
        <p>{t("useBody")}</p>

        <h2>{t("ipTitle")}</h2>
        <p>{t("ipBody", { entity: SITE.legalEntity })}</p>

        <h2>{t("liabilityTitle")}</h2>
        <p>{t("liabilityBody", { entity: SITE.legalEntity })}</p>

        <h2>{t("confidentialityTitle")}</h2>
        <p>{t("confidentialityBody")}</p>

        <h2>{t("governingTitle")}</h2>
        <p>{t("governingBody")}</p>

        <h2>{t("contactTitle")}</h2>
        <p>{t("contactBody", { email: SITE.email })}</p>
      </div>
    </section>
  );
}
