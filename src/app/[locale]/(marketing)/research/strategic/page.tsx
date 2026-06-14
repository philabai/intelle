import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { localizeResearchServices } from "@/lib/constants/i18n/localize";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[6];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const s = localizeResearchServices(locale)[6];
  return {
    title: `${s.title}${t("detailCommon.titleSuffix")}`,
    description: s.description,
    keywords: [
      "M&A diligence engineering",
      "industrial software M&A",
      "sovereign wealth diligence",
      "board briefing industrial AI",
      "custom engineering research",
      "partner-led consulting",
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

export default async function StrategicPage() {
  const _localized = localizeResearchServices(await getLocale())[6];
  return <ResearchServiceDetail service={_localized} />;
}
