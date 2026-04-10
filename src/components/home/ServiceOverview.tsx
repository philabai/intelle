import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { Button } from "@/components/ui/Button";
import { RESEARCH_SERVICES, ENGINEERING_SERVICES } from "@/lib/constants";

export function ServiceOverview() {
  return (
    <section className="py-20 bg-brand-navy">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="What We Do"
          title="Two Service Tracks"
          description="Spanning the full research and engineering intelligence lifecycle"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Research Services */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-brand-teal/10 flex items-center justify-center">
                <ServiceIcon
                  name="Search"
                  className="text-brand-teal"
                  size={20}
                />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Research & Innovation Services
              </h3>
            </div>
            <p className="text-muted text-sm mb-6">
              Bespoke intelligence across energy, standards, AI, technology
              scouting, market intelligence, and patent analytics.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {RESEARCH_SERVICES.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center gap-2 text-sm text-muted/80"
                >
                  <ServiceIcon
                    name={service.icon}
                    size={14}
                    className="text-brand-teal/60"
                  />
                  <span>{service.shortTitle}</span>
                </div>
              ))}
            </div>
            <Button href="/research" variant="outline" size="sm">
              View Research Services
            </Button>
          </Card>

          {/* Engineering Services */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                <ServiceIcon
                  name="Layers"
                  className="text-brand-blue"
                  size={20}
                />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Engineering Intelligence Services
              </h3>
            </div>
            <p className="text-muted text-sm mb-6">
              Implementation, integration, and consulting services that help
              engineering organizations extract maximum value from their tools.
            </p>
            <div className="grid grid-cols-1 gap-3 mb-6">
              {ENGINEERING_SERVICES.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center gap-2 text-sm text-muted/80"
                >
                  <ServiceIcon
                    name={service.icon}
                    size={14}
                    className="text-brand-blue/60"
                  />
                  <span>{service.shortTitle}</span>
                </div>
              ))}
            </div>
            <Button href="/engineering" variant="outline" size="sm">
              View Engineering Services
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
}
