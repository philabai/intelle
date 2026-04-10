import type { Metadata } from "next";
import { INDUSTRIES } from "@/lib/constants";
import { IndustryDetail } from "@/components/industries/IndustryDetail";

const industry = INDUSTRIES[3];

export const metadata: Metadata = {
  title: `${industry.title} Intelligence Services`,
  description: industry.description,
};

export default function ManufacturingPage() {
  return <IndustryDetail industry={industry} />;
}
