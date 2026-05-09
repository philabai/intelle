import Link from "next/link";
import type { ServiceCategory } from "@/lib/types";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/ui/GradientText";
import { TldrCallout } from "@/components/seo/TldrCallout";
import { FAQSection } from "@/components/seo/FAQSection";
import { JsonLd, faqSchema, serviceSchema } from "@/lib/seo/json-ld";

export function ResearchServiceDetail({ service }: { service: ServiceCategory }) {
  return (
    <>
      <JsonLd data={serviceSchema(service.title, service.description, service.href)} />
      {service.faqs?.length ? <JsonLd data={faqSchema(service.faqs)} /> : null}
      {/* Breadcrumb */}
      <div className="border-b border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted">
            <Link href="/" className="hover:text-heading transition-colors">Home</Link>
            <span>/</span>
            <Link href="/research" className="hover:text-heading transition-colors">Research Services</Link>
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
              <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center">
                <ServiceIcon name={service.icon} className="text-brand-teal" size={24} />
              </div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal">
                Research Service
              </p>
            </div>
            <h1 className="text-3xl font-bold text-heading sm:text-4xl lg:text-5xl">
              {service.title}
            </h1>
            <p className="mt-6 text-lg text-muted leading-relaxed">
              {service.description}
            </p>
            {service.tldr?.length ? <TldrCallout items={service.tldr} /> : null}
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
                  <div className="mt-1 w-5 h-5 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Methodology */}
      {service.methodology && service.methodology.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Our <GradientText>Methodology</GradientText>
            </h2>
            <div className="space-y-4">
              {service.methodology.map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-card-bg border border-card-border">
                  <div className="w-8 h-8 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-brand-teal">{i + 1}</span>
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
            What We <GradientText>Deliver</GradientText>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {service.deliverables.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-card-bg border border-card-border">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      {service.whoItsFor && service.whoItsFor.length > 0 && (
        <section className="py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Who It&apos;s <GradientText>For</GradientText>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {service.whoItsFor.map((persona, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-card-bg border border-card-border">
                  <div className="w-2 h-2 rounded-full bg-brand-teal shrink-0" />
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
              Expected <GradientText>Outcomes</GradientText>
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
              Illustrative <GradientText>Projects</GradientText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {service.sampleProjects.map((project) => (
                <div key={project.title} className="p-6 rounded-xl bg-card-bg border border-card-border">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal">{project.industry}</span>
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
              Engagement <GradientText>Models</GradientText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {service.engagementModels.map((model) => (
                <div key={model.model} className="p-6 rounded-xl bg-card-bg border border-card-border">
                  <h3 className="text-lg font-semibold text-heading mb-2">{model.model}</h3>
                  <p className="text-sm text-muted mb-4">{model.description}</p>
                  <p className="text-xs text-brand-teal font-medium">{model.typicalDuration}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Focus Areas */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-heading mb-8">Key Focus Areas</h2>
          <div className="flex flex-wrap gap-3">
            {service.focusAreas.map((area) => (
              <span
                key={area}
                className="px-4 py-2 rounded-full bg-card-bg border border-card-border text-sm text-muted hover:border-brand-teal/30 hover:text-brand-teal transition-colors"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      {service.faqs?.length ? (
        <section className="py-8 border-t border-card-border">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <FAQSection faqs={service.faqs} />
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-heading mb-4">
            Interested in {service.shortTitle}?
          </h2>
          <p className="text-muted mb-8 max-w-xl mx-auto">
            Every engagement starts with a free diagnostic call. Tell us about your research needs and we&apos;ll scope a bespoke engagement.
          </p>
          <Button href="/book" size="lg">Schedule a Consultation</Button>
        </div>
      </section>
    </>
  );
}
