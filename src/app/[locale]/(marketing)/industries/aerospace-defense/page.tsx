import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { localizeIndustries } from "@/lib/constants/i18n/localize";
import { INDUSTRIES } from "@/lib/constants";
import { IndustryDetail } from "@/components/industries/IndustryDetail";

const industry = INDUSTRIES[1];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const i = localizeIndustries(locale)[1];
  return {
    title: `${i.title}${t("detailCommon.titleSuffix")}`,
    description: i.description,
    keywords: [
      "aerospace defense engineering consultant",
      "MIL-STD compliance research",
      "AS9100 consultant",
      "defense supplier research",
      "aerospace engineering AI",
    ],
    alternates: { canonical: industry.href },
    openGraph: {
      title: i.title,
      description: i.description,
      url: industry.href,
      type: "website",
    },
    twitter: { card: "summary_large_image", title: i.title },
  };
}

export default async function AerospaceDefensePage() {
  const _localized = localizeIndustries(await getLocale())[1];
  return <IndustryDetail industry={_localized} />;
}
