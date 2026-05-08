import type { Metadata } from "next";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { EngineeringServiceDetail } from "@/components/engineering/EngineeringServiceDetail";

const service = ENGINEERING_SERVICES[2];
export const metadata: Metadata = {
  title: "Engineering Knowledge Management & Semantic Search | intelle.io",
  description:
    "Knowledge management for engineering: semantic search, taxonomy, GenAI guardrails, lessons-learned capture. Vendor-neutral. India-based delivery bench. NOC + EPC + MedDev.",
  keywords: [
    "engineering knowledge management",
    "semantic search engineering",
    "GenAI guardrails",
    "lessons learned NOC",
    "engineering taxonomy design",
    "knowledge governance",
  ],
  alternates: { canonical: service.href },
  openGraph: {
    title: "Engineering Knowledge Management",
    description:
      "Semantic search, taxonomy, GenAI guardrails, lessons-learned capture. Vendor-neutral. India delivery bench.",
    url: service.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Engineering Knowledge Management" },
};

export default function KnowledgeManagementPage() {
  return <EngineeringServiceDetail service={service} />;
}
