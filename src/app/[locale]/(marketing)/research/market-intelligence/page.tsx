import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { localizeResearchServices } from "@/lib/constants/i18n/localize";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[4];

export const metadata: Metadata = {
  title: "Market & Competitive Intelligence | GCC, India Industrial Markets | intelle.io",
  description:
    "Market sizing, buyer personas, competitor positioning, GTM for engineering-heavy industrial markets. 3-4 week Market Entry Scan. Senior-led.",
  keywords: [
    "market intelligence GCC industrial",
    "buyer persona GCC",
    "competitive intelligence engineering",
    "GTM strategy NOC",
    "industrial market sizing",
    "GCC market entry consultancy",
  ],
  alternates: { canonical: service.href },
  openGraph: {
    title: "Market & Competitive Intelligence",
    description:
      "Market sizing, buyer personas, competitor positioning, GTM. 3-4 week Market Entry Scan.",
    url: service.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Market & Competitive Intelligence" },
};

export default async function MarketIntelligencePage() {
  const _localized = localizeResearchServices(await getLocale())[4];
  return <ResearchServiceDetail service={_localized} />;
}
