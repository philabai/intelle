import type { Metadata } from "next";
import { INDUSTRIES } from "@/lib/constants";
import { IndustryDetail } from "@/components/industries/IndustryDetail";

const industry = INDUSTRIES[1];

export const metadata: Metadata = {
  title: "Aerospace & Defense Engineering Research | MIL-STD, AS9100 | intelle.io",
  description:
    "Engineering research and advisory for aerospace and defense suppliers: MIL-STD compliance, AS9100, export-control overlays, MedDev-adjacent diligence.",
  keywords: [
    "aerospace defense engineering consultant",
    "MIL-STD compliance research",
    "AS9100 consultant",
    "defense supplier research",
    "aerospace engineering AI",
  ],
  alternates: { canonical: industry.href },
  openGraph: {
    title: "Aerospace & Defense Engineering Intelligence",
    description:
      "MIL-STD compliance, AS9100, export-control overlays, MedDev-adjacent diligence.",
    url: industry.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Aerospace & Defense Engineering Intelligence" },
};

export default function AerospaceDefensePage() {
  return <IndustryDetail industry={industry} />;
}
