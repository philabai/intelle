import type { Metadata } from "next";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[2];

export const metadata: Metadata = {
  title: "Industrial AI & GenAI Research | Engineering Pilot Scoping | intelle.io",
  description:
    "Senior-led industrial AI and GenAI research for engineering organizations. AI Readiness Brief (2 weeks). 90-day pilot scoping. SAE-published practitioner expertise. NOC + EPC + MedDev.",
  keywords: [
    "industrial AI consultancy",
    "GenAI engineering pilot",
    "AI readiness brief",
    "industrial AI scoping",
    "cognitive operations research",
    "NOC AI strategy",
    "engineering AI vendor evaluation",
  ],
  alternates: { canonical: service.href },
  openGraph: {
    title: "Industrial AI & Digitalization Research",
    description:
      "Senior-led AI Readiness Brief, 90-day pilot scoping, vendor evaluation. SAE-published practitioner expertise.",
    url: service.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Industrial AI & Digitalization Research" },
};

export default function AIDigitalizationPage() {
  return <ResearchServiceDetail service={service} />;
}
