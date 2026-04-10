import type { Metadata } from "next";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[6];

export const metadata: Metadata = {
  title: service.title,
  description: service.description,
};

export default function StrategicPage() {
  return <ResearchServiceDetail service={service} />;
}
