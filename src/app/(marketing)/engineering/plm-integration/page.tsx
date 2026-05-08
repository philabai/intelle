import type { Metadata } from "next";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { EngineeringServiceDetail } from "@/components/engineering/EngineeringServiceDetail";

const service = ENGINEERING_SERVICES[1];
export const metadata: Metadata = {
  title: "PLM/ALM Implementation | Teamcenter, Windchill, DOORS | intelle.io",
  description:
    "End-to-end PLM/ALM integration for engineering organizations: Siemens Teamcenter, PTC Windchill, IBM DOORS, Codebeamer. Aerospace, MedDev, EPC delivery. India bench.",
  keywords: [
    "PLM ALM consulting GCC",
    "Teamcenter implementation",
    "Windchill integration",
    "IBM DOORS migration",
    "Codebeamer consulting",
    "MedDev DHF PLM",
    "requirements traceability",
  ],
  alternates: { canonical: service.href },
  openGraph: {
    title: "PLM/ALM Implementation & Requirements Digitalization",
    description:
      "Siemens Teamcenter, PTC Windchill, IBM DOORS, Codebeamer integration. Aerospace, MedDev, EPC delivery.",
    url: service.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "PLM/ALM Implementation & Requirements Digitalization" },
};

export default function PLMIntegrationPage() {
  return <EngineeringServiceDetail service={service} />;
}
