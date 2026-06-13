import type { Metadata } from "next";
import { INDUSTRIES } from "@/lib/constants";
import { IndustryDetail } from "@/components/industries/IndustryDetail";

const industry = INDUSTRIES[3];

export const metadata: Metadata = {
  title: "Advanced Manufacturing Engineering Research | Industry 4.0 | intelle.io",
  description:
    "Engineering research for advanced manufacturing: Industry 4.0 adoption, digital twin, AI-enabled production, lights-out factories. India and GCC delivery.",
  keywords: [
    "advanced manufacturing consulting",
    "Industry 4.0 research",
    "digital twin engineering",
    "AI manufacturing GCC",
    "lights-out factory consulting",
  ],
  alternates: { canonical: industry.href },
  openGraph: {
    title: "Advanced Manufacturing Engineering Intelligence",
    description:
      "Industry 4.0 adoption, digital twin, AI-enabled production, lights-out factories. India + GCC delivery.",
    url: industry.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Advanced Manufacturing Engineering Intelligence" },
};

export default function ManufacturingPage() {
  return <IndustryDetail industry={industry} />;
}
