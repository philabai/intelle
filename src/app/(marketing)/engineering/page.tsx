import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { ENGINEERING_SERVICES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Engineering Intelligence Services",
  description:
    "Implementation, integration, and consulting services that help engineering organizations extract maximum value from their tools and processes.",
};

export default function EngineeringPage() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Engineering Intelligence"
          title="Four Service Lines"
          description="Helping engineering organizations extract maximum value from their standards management and knowledge platforms"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ENGINEERING_SERVICES.map((service) => (
            <Card key={service.id} href={service.href} className="p-6">
              <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center mb-4">
                <ServiceIcon name={service.icon} className="text-brand-blue" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-heading mb-2">{service.title}</h3>
              <p className="text-sm text-muted">{service.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {service.focusAreas.slice(0, 3).map((area) => (
                  <span key={area} className="text-xs px-2 py-0.5 rounded-full bg-card-border text-muted">
                    {area}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
