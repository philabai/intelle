import type { Metadata } from "next";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[5];

export const metadata: Metadata = {
  title: "Patent & IP Intelligence | FTO, Landscape, White-Space | intelle.io",
  description:
    "Engineer-led freedom-to-operate (FTO), patent landscape, and white-space analysis for industrial technologies. Hydrogen, CCUS, MedDev. Derwent + Questel + practitioner judgment.",
  keywords: [
    "FTO analysis industrial",
    "patent landscape hydrogen",
    "IP white-space mapping",
    "MedDev patent strategy",
    "Derwent Questel analysis",
    "industrial IP surveillance",
  ],
  alternates: { canonical: service.href },
  openGraph: {
    title: "Patent & IP Intelligence — Engineer-Led",
    description:
      "FTO, patent landscape, white-space. Engineer-led, not generalist. Derwent + Questel + practitioner judgment.",
    url: service.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Patent & IP Intelligence — Engineer-Led" },
};

export default function PatentIPPage() {
  return <ResearchServiceDetail service={service} />;
}
