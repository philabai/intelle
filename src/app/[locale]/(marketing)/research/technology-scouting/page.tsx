import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { localizeResearchServices } from "@/lib/constants/i18n/localize";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[3];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const s = localizeResearchServices(locale)[3];
  return {
    title: `${s.title}${t("detailCommon.titleSuffix")}`,
    description: s.description,
    keywords: [
      "technology scouting services NOC",
      "industrial vendor scouting",
      "hydrogen tech scouting",
      "CCUS startup scouting",
      "ADNOC technology scouting",
      "Aramco Ventures scouting",
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

export default async function TechnologyScoutingPage() {
  const _localized = localizeResearchServices(await getLocale())[3];
  return <ResearchServiceDetail service={_localized} />;
}
