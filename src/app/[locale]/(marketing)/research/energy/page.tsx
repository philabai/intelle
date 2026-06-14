import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { localizeResearchServices } from "@/lib/constants/i18n/localize";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[0];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const s = localizeResearchServices(locale)[0];
  const title = `${s.title}${t("detailCommon.titleSuffix")}`;
  return {
    title,
    description: s.description,
    keywords: [
      "energy research services GCC",
      "hydrogen economy research",
      "CCUS market intelligence",
      "GCC energy transition",
      "NOC energy strategy",
      "GE Energy IHS Markit alumni",
    ],
    alternates: { canonical: service.href },
    openGraph: {
      title: s.title,
      description: s.description,
      url: service.href,
      type: "website",
    },
    twitter: { card: "summary_large_image", title: s.title },
  };
}

export default async function EnergyResearchPage() {
  const _localized = localizeResearchServices(await getLocale())[0];
  return <ResearchServiceDetail service={_localized} />;
}
