import type { Metadata } from "next";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { EngineeringServiceDetail } from "@/components/engineering/EngineeringServiceDetail";

const service = ENGINEERING_SERVICES[1];
export const metadata: Metadata = {
  title:
    "Digital Threading & Traceability — Engineering Change Management, RM/PLM/ALM Connectors | intelle.io",
  description:
    "Decompose standards and regulations into structured, traceable requirement objects and thread them into your engineering toolchain. API connectors into PTC Codebeamer, PTC Windchill, IBM DOORS, Jama Connect, Siemens Polarion, Siemens Teamcenter, and IBM Maximo. Engineering change management, MOC, and audit-ready traceability — delivered end to end.",
  keywords: [
    "digital threading",
    "digital thread implementation",
    "requirements traceability and threading",
    "requirements traceability",
    "engineering change management",
    "MOC management of change",
    "PTC Codebeamer integration",
    "PTC Windchill integration",
    "IBM DOORS integration",
    "Jama Connect integration",
    "Siemens Polarion integration",
    "Siemens Teamcenter integration",
    "IBM Maximo standards integration",
    "requirements decomposition",
    "MBSE",
    "model-based systems engineering",
    "Accuris Thread",
  ],
  alternates: { canonical: service.href },
  openGraph: {
    title:
      "Digital Threading & Traceability — Engineering Change Management, RM/PLM/ALM Connectors",
    description:
      "Decompose standards into structured requirement objects and thread them into PTC, IBM, Siemens, and Jama toolchains. Engineering change management and audit-ready traceability, delivered end to end.",
    url: service.href,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Digital Threading & Traceability — Engineering Change Management",
  },
};

export default function PLMIntegrationPage() {
  return <EngineeringServiceDetail service={service} />;
}
