import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { localizeEngineeringServices } from "@/lib/constants/i18n/localize";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { EngineeringServiceDetail } from "@/components/engineering/EngineeringServiceDetail";

const service = ENGINEERING_SERVICES[2];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const s = localizeEngineeringServices(locale)[2];
  return {
    title: `${s.title}${t("detailCommon.titleSuffix")}`,
    description: s.description,
    keywords: [
      "knowledge management strategy",
      "KM advisory engineering",
      "SECI model",
      "Nonaka knowledge management",
      "APQC KMCAT",
      "Kulkarni Freeze KMCA",
      "Siemens KMMM",
      "KM maturity assessment",
      "KM benchmarking",
      "CII BM&M lessons learned",
      "GenAI strategy for KM",
      "GraphRAG strategy",
      "Chief Knowledge Officer advisory",
      "engineering knowledge management roadmap",
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

export default async function KnowledgeManagementStrategyPage() {
  const _localized = localizeEngineeringServices(await getLocale())[2];
  return <EngineeringServiceDetail service={_localized} />;
}
