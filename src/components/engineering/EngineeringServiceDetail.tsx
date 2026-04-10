import Link from "next/link";
import type { ServiceCategory } from "@/lib/types";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/ui/GradientText";

export function EngineeringServiceDetail({ service }: { service: ServiceCategory }) {
  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted">
            <Link href="/" className="hover:text-heading transition-colors">Home</Link>
            <span>/</span>
            <Link href="/engineering" className="hover:text-heading transition-colors">Engineering Services</Link>
            <span>/</span>
            <span className="text-heading">{service.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                <ServiceIcon name={service.icon} className="text-brand-blue" size={24} />
              </div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-blue">
                Engineering Service
              </p>
            </div>
            <h1 className="text-3xl font-bold text-heading sm:text-4xl lg:text-5xl">
              {service.title}
            </h1>
            <p className="mt-6 text-lg text-muted leading-relaxed">
              {service.description}
            </p>
          </div>
        </div>
      </section>

      {/* Differentiators Strip */}
      {service.differentiators && service.differentiators.length > 0 && (
        <section className="py-10 border-y border-card-border bg-card-bg/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {service.differentiators.map((diff, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted leading-relaxed">{diff}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Implementation Timeline */}
      {service.implementationTimeline && service.implementationTimeline.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Implementation <GradientText variant="blue-violet">Timeline</GradientText>
            </h2>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-brand-blue/20 hidden md:block" />
              <div className="space-y-4">
                {service.implementationTimeline.map((phase, i) => (
                  <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-card-bg border border-card-border md:ml-8 relative">
                    {/* Connector dot */}
                    <div className="hidden md:block absolute -left-[calc(2rem+4.5px)] top-6 w-2.5 h-2.5 rounded-full bg-brand-blue ring-4 ring-background" />
                    <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-brand-blue">{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-heading">{phase.phase}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue font-medium">
                          {phase.duration}
                        </span>
                      </div>
                      <p className="text-sm text-muted">{phase.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Methodology */}
      {service.methodology && service.methodology.length > 0 && (
        <section className="py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Our <GradientText variant="blue-violet">Approach</GradientText>
            </h2>
            <div className="space-y-4">
              {service.methodology.map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-card-bg border border-card-border">
                  <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-brand-blue">{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-heading">{step.step}</h3>
                    <p className="text-sm text-muted mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Deliverables */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-heading mb-8">
            What We <GradientText variant="blue-violet">Deliver</GradientText>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {service.deliverables.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-card-bg border border-card-border">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Partners */}
      {service.technologyPartners && service.technologyPartners.length > 0 && (
        <section className="py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Technology <GradientText variant="blue-violet">Partners</GradientText>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {service.technologyPartners.map((partner) => (
                <div key={partner.name} className="p-4 rounded-xl bg-card-bg border border-card-border text-center">
                  <p className="text-sm font-semibold text-heading">{partner.name}</p>
                  <p className="text-xs text-muted mt-1">{partner.type}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Who It's For */}
      {service.whoItsFor && service.whoItsFor.length > 0 && (
        <section className="py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Who It&apos;s <GradientText variant="blue-violet">For</GradientText>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {service.whoItsFor.map((persona, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-card-bg border border-card-border">
                  <div className="w-2 h-2 rounded-full bg-brand-blue shrink-0" />
                  <p className="text-sm text-muted">{persona}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Expected Outcomes */}
      {service.expectedOutcomes && service.expectedOutcomes.length > 0 && (
        <section className="py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Expected <GradientText variant="blue-violet">Outcomes</GradientText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {service.expectedOutcomes.map((outcome) => (
                <Card key={outcome.title} hover={false} className="p-6">
                  <h3 className="text-base font-semibold text-heading mb-2">{outcome.title}</h3>
                  <p className="text-sm text-muted">{outcome.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sample Projects */}
      {service.sampleProjects && service.sampleProjects.length > 0 && (
        <section className="py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Illustrative <GradientText variant="blue-violet">Projects</GradientText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {service.sampleProjects.map((project) => (
                <div key={project.title} className="p-6 rounded-xl bg-card-bg border border-card-border">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue">{project.industry}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-card-border text-muted">{project.duration}</span>
                  </div>
                  <h3 className="text-base font-semibold text-heading mb-2">{project.title}</h3>
                  <p className="text-sm text-muted">{project.scope}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Engagement Models */}
      {service.engagementModels && service.engagementModels.length > 0 && (
        <section className="py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Engagement <GradientText variant="blue-violet">Models</GradientText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {service.engagementModels.map((model) => (
                <div key={model.model} className="p-6 rounded-xl bg-card-bg border border-card-border">
                  <h3 className="text-lg font-semibold text-heading mb-2">{model.model}</h3>
                  <p className="text-sm text-muted mb-4">{model.description}</p>
                  <p className="text-xs text-brand-blue font-medium">{model.typicalDuration}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Capabilities */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-heading mb-8">Capabilities</h2>
          <div className="flex flex-wrap gap-3">
            {service.focusAreas.map((area) => (
              <span key={area} className="px-4 py-2 rounded-full bg-card-bg border border-card-border text-sm text-muted hover:border-brand-blue/30 hover:text-brand-blue transition-colors">
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-heading mb-4">
            Ready to get started with {service.shortTitle}?
          </h2>
          <p className="text-muted mb-8 max-w-xl mx-auto">
            Every engagement starts with a free diagnostic call. Tell us about your engineering challenges and we&apos;ll scope a tailored solution.
          </p>
          <Button href="/contact" size="lg">Schedule a Consultation</Button>
        </div>
      </section>
    </>
  );
}
