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
    title: t("cookies.title"),
    description: t("cookies.description"),
    alternates: { canonical: "/cookies" },
    robots: { index: true, follow: true },
  };
}

export default async function CookiesPage() {
  const t = await getTranslations("cookiesPage");
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-invert prose-sm max-w-none">
        <h1>{t("title")}</h1>
        <p className="text-muted">{t("lastUpdated")}</p>
        <p>{t("intro", { name: SITE.name, entity: SITE.legalEntity })}</p>

        <h2>{t("whatTitle")}</h2>
        <p>{t("whatBody")}</p>

        <h2>{t("useTitle")}</h2>
        <h3>{t("essentialTitle")}</h3>
        <p>{t("essentialBody")}</p>
        <h3>{t("analyticsTitle")}</h3>
        <p>{t("analyticsBody")}</p>
        <h3>{t("authTitle")}</h3>
        <p>{t("authBody")}</p>

        <h2>{t("managingTitle")}</h2>
        <p>{t("managingBody")}</p>

        <h2>{t("contactTitle")}</h2>
        <p>{t("contactBody", { email: SITE.email })}</p>
      </div>
    </section>
  );
}
