import type { Metadata } from "next";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[5];

export const metadata: Metadata = {
  title: service.title,
  description: service.description,
};

export default function PatentIPPage() {
  return <ResearchServiceDetail service={service} />;
}
