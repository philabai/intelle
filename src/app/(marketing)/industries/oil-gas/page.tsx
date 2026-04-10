import type { Metadata } from "next";
import { INDUSTRIES } from "@/lib/constants";
import { IndustryDetail } from "@/components/industries/IndustryDetail";

const industry = INDUSTRIES[0];

export const metadata: Metadata = {
  title: `${industry.title} Intelligence Services`,
  description: industry.description,
};

export default function OilGasPage() {
  return <IndustryDetail industry={industry} />;
}
