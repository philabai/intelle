import type { Metadata } from "next";
import { INDUSTRIES } from "@/lib/constants";
import { IndustryDetail } from "@/components/industries/IndustryDetail";

const industry = INDUSTRIES[0];

export const metadata: Metadata = {
  title: "Oil & Gas Engineering Research & Consulting | GCC + India | intelle.io",
  description:
    "Senior-practitioner engineering research and advisory for upstream, midstream, downstream Oil & Gas. NOC innovation, EPC bid support, energy transition. F500 reference engagements.",
  keywords: [
    "oil gas engineering consultancy GCC",
    "ADNOC research partner",
    "Aramco engineering research",
    "NOC consultancy GCC",
    "upstream digital transformation",
    "downstream AI advisory",
  ],
  alternates: { canonical: industry.href },
  openGraph: {
    title: "Oil & Gas Engineering Intelligence",
    description:
      "Senior-practitioner research for upstream, midstream, downstream. NOC innovation, EPC bid support, energy transition.",
    url: industry.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Oil & Gas Engineering Intelligence" },
};

export default function OilGasPage() {
  return <IndustryDetail industry={industry} />;
}
