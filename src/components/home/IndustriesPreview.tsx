import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { INDUSTRIES } from "@/lib/constants";

export function IndustriesPreview() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Industries"
          title="Deep Domain Expertise"
          description="Published author, conference speaker, and recognized expert across four major industry verticals"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {INDUSTRIES.map((industry) => (
            <Card key={industry.id} href={industry.href} className="text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center mb-4">
                <ServiceIcon
                  name={industry.icon}
                  className="text-brand-blue"
                  size={24}
                />
              </div>
              <h3 className="text-lg font-semibold text-heading mb-2">
                {industry.title}
              </h3>
              <p className="text-sm text-muted line-clamp-3">
                {industry.description}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {industry.standards.slice(0, 3).map((std) => (
                  <span
                    key={std}
                    className="text-xs px-2 py-0.5 rounded-full bg-card-border text-muted"
                  >
                    {std}
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
