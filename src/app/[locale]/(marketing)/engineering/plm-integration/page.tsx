import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { localizeEngineeringServices } from "@/lib/constants/i18n/localize";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { EngineeringServiceDetail } from "@/components/engineering/EngineeringServiceDetail";

const service = ENGINEERING_SERVICES[1];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const s = localizeEngineeringServices(locale)[1];
  return {
    title: `${s.title}${t("detailCommon.titleSuffix")}`,
    description: s.description,
    keywords: [
      "digital threading",
      "digital thread implementation",
      "requirements traceability and threading",
      "requirements traceability",
      "engineering change management",
      "MOC management of change",
      "PTC Codebeamer integration",
      "PTC Windchill integration",
      "IBM DOORS integration",
      "Jama Connect integration",
      "Siemens Polarion integration",
      "Siemens Teamcenter integration",
      "IBM Maximo standards integration",
      "requirements decomposition",
      "MBSE",
      "model-based systems engineering",
      "Accuris Thread",
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

export default async function PLMIntegrationPage() {
  const _localized = localizeEngineeringServices(await getLocale())[1];
  return <EngineeringServiceDetail service={_localized} />;
}
