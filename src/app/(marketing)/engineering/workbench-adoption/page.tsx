import type { Metadata } from "next";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { EngineeringServiceDetail } from "@/components/engineering/EngineeringServiceDetail";

const service = ENGINEERING_SERVICES[0];
export const metadata: Metadata = { title: service.title, description: service.description };

export default function WorkbenchAdoptionPage() {
  return <EngineeringServiceDetail service={service} />;
}
