import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { localizeEngineeringServices } from "@/lib/constants/i18n/localize";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { EngineeringServiceDetail } from "@/components/engineering/EngineeringServiceDetail";

const service = ENGINEERING_SERVICES[0];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const s = localizeEngineeringServices(locale)[0];
  return {
    title: `${s.title}${t("detailCommon.titleSuffix")}`,
    description: s.description,
    keywords: [
      "Accuris Workbench adoption",
      "Goldfire adoption",
      "engineering content platform adoption",
      "standards library rollout",
      "Knovel adoption",
      "engineering platform ROI",
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

export default async function WorkbenchAdoptionPage() {
  const _localized = localizeEngineeringServices(await getLocale())[0];
  return <EngineeringServiceDetail service={_localized} />;
}
