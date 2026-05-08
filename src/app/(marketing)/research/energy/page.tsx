import type { Metadata } from "next";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[0];

export const metadata: Metadata = {
  title: "Energy Research Services | Hydrogen, CCUS, GCC | intelle.io",
  description:
    "Decision-ready energy research for GCC + India: hydrogen economy, CCUS, energy transition, oil & gas digitalization. 25+ years across S&P Global, IHS Markit, GE Energy.",
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
    title: "Energy Research — Decision-Ready Intelligence",
    description:
      "Hydrogen economy, CCUS, energy transition, oil & gas digitalization. 25+ years senior practitioner depth.",
    url: service.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Energy Research — Decision-Ready Intelligence" },
};

export default function EnergyResearchPage() {
  return <ResearchServiceDetail service={service} />;
}
