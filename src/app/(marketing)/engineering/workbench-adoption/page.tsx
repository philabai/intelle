import type { Metadata } from "next";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { EngineeringServiceDetail } from "@/components/engineering/EngineeringServiceDetail";

const service = ENGINEERING_SERVICES[0];
export const metadata: Metadata = {
  title: "Accuris Workbench & Engineering Platform Adoption | intelle.io",
  description:
    "Make Accuris Engineering Workbench, Goldfire, and standards libraries actually used. Adoption diagnostic, role-based training, value-realization KPIs. Mid-tier EPC + NOC delivery.",
  keywords: [
    "Accuris Workbench adoption",
    "Goldfire adoption",
    "engineering content platform adoption",
    "standards library rollout",
    "Knovel adoption",
    "engineering platform ROI",
  ],
  alternates: { canonical: service.href },
  openGraph: {
    title: "Engineering Platform Adoption & Value Realization",
    description:
      "Make Accuris Workbench, Goldfire, standards libraries actually used. Adoption diagnostic + role-based training.",
    url: service.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Engineering Platform Adoption & Value Realization" },
};

export default function WorkbenchAdoptionPage() {
  return <EngineeringServiceDetail service={service} />;
}
