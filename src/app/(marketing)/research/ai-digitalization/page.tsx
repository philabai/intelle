import type { Metadata } from "next";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[2];

export const metadata: Metadata = {
  title: service.title,
  description: service.description,
};

export default function AIDigitalizationPage() {
  return <ResearchServiceDetail service={service} />;
}
