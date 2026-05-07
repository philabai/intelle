import { RESEARCH_SERVICES, ENGINEERING_SERVICES } from "@/lib/constants";
import type { EngagementServiceType, ServiceCategory } from "@/lib/types";

export function findService(
  service_type: EngagementServiceType,
  service_id: string
): ServiceCategory | undefined {
  const list = service_type === "research" ? RESEARCH_SERVICES : ENGINEERING_SERVICES;
  return list.find((s) => s.id === service_id);
}

export function serviceLabel(
  service_type: EngagementServiceType,
  service_id: string
): string {
  const s = findService(service_type, service_id);
  if (!s) return service_id;
  return service_type === "engineering" ? s.shortTitle : s.title;
}

export function allServiceOptions() {
  return [
    ...RESEARCH_SERVICES.map((s) => ({
      service_type: "research" as const,
      service_id: s.id,
      title: s.title,
      shortTitle: s.title,
      href: s.href,
    })),
    ...ENGINEERING_SERVICES.map((s) => ({
      service_type: "engineering" as const,
      service_id: s.id,
      title: s.title,
      shortTitle: s.shortTitle,
      href: s.href,
    })),
  ];
}
