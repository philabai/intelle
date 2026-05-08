import type { Metadata } from "next";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[1];

export const metadata: Metadata = {
  title: "Standards & Regulations Research | API, ASME, ISO, FDA, EU MDR | intelle.io",
  description:
    "Senior practitioner standards research and advisory: API, ASME, ISO, IEC, MIL-STD, FDA, EU MDR. MoIAT/SASO/ESMA harmonization. Mid-tier EPC bid support. NOC tender preparation.",
  keywords: [
    "standards research services API ASME",
    "ISO standards consultancy",
    "FDA EU MDR research",
    "MIL-STD compliance research",
    "MoIAT SASO harmonization",
    "NOC tender standards",
  ],
  alternates: { canonical: service.href },
  openGraph: {
    title: "Standards & Regulations Research",
    description:
      "API, ASME, ISO, IEC, MIL-STD, FDA, EU MDR. MoIAT/SASO/ESMA harmonization. Mid-tier EPC + NOC.",
    url: service.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Standards & Regulations Research" },
};

export default function StandardsPage() {
  return <ResearchServiceDetail service={service} />;
}
