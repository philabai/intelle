import type { Metadata } from "next";
import { INDUSTRIES } from "@/lib/constants";
import { IndustryDetail } from "@/components/industries/IndustryDetail";

const industry = INDUSTRIES[2];

export const metadata: Metadata = {
  title: "Medical Devices Engineering Research | FDA, EU MDR | intelle.io",
  description:
    "Engineering research and advisory for medical device firms: FDA pre-submissions, EU MDR compliance, design history file integration with PLM, AI in MedDev workflows.",
  keywords: [
    "medical device engineering consultant",
    "FDA pre-submission consultant",
    "EU MDR research",
    "MedDev DHF PLM",
    "predicate device research",
    "AI in medical devices",
  ],
  alternates: { canonical: industry.href },
  openGraph: {
    title: "Medical Devices Engineering Intelligence",
    description:
      "FDA pre-submissions, EU MDR compliance, design history file integration, AI in MedDev workflows.",
    url: industry.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Medical Devices Engineering Intelligence" },
};

export default function MedicalDevicesPage() {
  return <IndustryDetail industry={industry} />;
}
