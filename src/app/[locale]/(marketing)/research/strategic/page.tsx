import type { Metadata } from "next";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[6];

export const metadata: Metadata = {
  title: "Strategic & Custom Engagements | M&A, Board Briefings | intelle.io",
  description:
    "Partner-led custom engagements: board briefings on industrial AI, M&A diligence for engineering-heavy industrials, sovereign wealth investment committee briefings. Senior-only delivery.",
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
    title: "Strategic & Custom Engagements",
    description:
      "Board briefings, M&A diligence, sovereign wealth investment committee briefings. Senior-only.",
    url: service.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Strategic & Custom Engagements" },
};

export default function StrategicPage() {
  return <ResearchServiceDetail service={service} />;
}
