import type { Metadata } from "next";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { EngineeringServiceDetail } from "@/components/engineering/EngineeringServiceDetail";

const service = ENGINEERING_SERVICES[2];
export const metadata: Metadata = {
  title:
    "KM Strategy & Advisory — SECI, Maturity, Benchmarking, GenAI for KM | intelle.io",
  description:
    "A four-pillar KM strategy for engineering enterprises: Nonaka/SECI diagnostic, multi-framework KM maturity evaluation (APQC KMCAT, Kulkarni-Freeze KMCA, Siemens KMMM), peer & sector benchmarking, and AI / GenAI strategy for KM. For CKOs, VP Engineering, and Chief Innovation Officers.",
  keywords: [
    "knowledge management strategy",
    "KM advisory engineering",
    "SECI model",
    "Nonaka knowledge management",
    "APQC KMCAT",
    "Kulkarni Freeze KMCA",
    "Siemens KMMM",
    "KM maturity assessment",
    "KM benchmarking",
    "CII BM&M lessons learned",
    "GenAI strategy for KM",
    "GraphRAG strategy",
    "Chief Knowledge Officer advisory",
    "engineering knowledge management roadmap",
  ],
  alternates: { canonical: service.href },
  openGraph: {
    title: "KM Strategy & Advisory — SECI, Maturity, Benchmarking, GenAI",
    description:
      "Four-pillar KM strategy: Nonaka/SECI, KM maturity (APQC, KMCA, KMMM), peer benchmarking, and AI/GenAI strategy for KM. Engineering enterprises.",
    url: service.href,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KM Strategy & Advisory — SECI, Maturity, Benchmarking, GenAI",
  },
};

export default function KnowledgeManagementStrategyPage() {
  return <EngineeringServiceDetail service={service} />;
}
