import type { Metadata } from "next";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { EngineeringServiceDetail } from "@/components/engineering/EngineeringServiceDetail";

const service = ENGINEERING_SERVICES[3];
export const metadata: Metadata = {
  title: "Standards Advisory Retainer | API, ASME, ISO, FDA, EU MDR | intelle.io",
  description:
    "Standing standards advisory retainer for engineering organizations. 25+ year senior standards architect on-call. Cross-functional bridge: engineering, QA, legal, procurement.",
  keywords: [
    "standards advisory retainer",
    "standards architect consulting",
    "on-call compliance advisor",
    "regulatory harmonization retainer",
    "NOC standards strategy",
  ],
  alternates: { canonical: service.href },
  openGraph: {
    title: "Standards Advisory — Standing Retainer",
    description:
      "Senior standards architect on retainer. API, ASME, ISO, FDA, EU MDR. Cross-functional bridge.",
    url: service.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Standards Advisory — Standing Retainer" },
};

export default function ComplianceAdvisoryPage() {
  return <EngineeringServiceDetail service={service} />;
}
