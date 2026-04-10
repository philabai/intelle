import type { Metadata } from "next";
import { INDUSTRIES } from "@/lib/constants";
import { IndustryDetail } from "@/components/industries/IndustryDetail";

const industry = INDUSTRIES[1];

export const metadata: Metadata = {
  title: `${industry.title} Intelligence Services`,
  description: industry.description,
};

export default function AerospaceDefensePage() {
  return <IndustryDetail industry={industry} />;
}
