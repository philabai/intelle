import Link from "next/link";
import type { ServiceCategory } from "@/lib/types";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/ui/GradientText";
import { TldrCallout } from "@/components/seo/TldrCallout";
import { FAQSection } from "@/components/seo/FAQSection";
import { JsonLd, faqSchema, serviceSchema } from "@/lib/seo/json-ld";
import { SECIDiagram } from "@/components/engineering/SECIDiagram";
import { DigitalThreadDiagram } from "@/components/engineering/DigitalThreadDiagram";
import { PlatformSpotlight } from "@/components/engineering/PlatformSpotlight";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";

type AccentKey = "blue" | "teal" | "violet";

const ACCENT: Record<
  AccentKey,
  {
    bg: string;
    text: string;
    ring: string;
    softBg: string;
    hoverBorder: string;
    borderL: string;
    gradient: "blue-violet" | "teal-blue";
  }
> = {
  blue: {
    bg: "bg-brand-blue/10",
    text: "text-brand-blue",
    ring: "bg-brand-blue",
    softBg: "bg-brand-blue/5",
    hoverBorder: "hover:border-brand-blue/30 hover:text-brand-blue",
    borderL: "border-brand-blue",
    gradient: "blue-violet",
  },
  teal: {
    bg: "bg-brand-teal/10",
    text: "text-brand-teal",
    ring: "bg-brand-teal",
    softBg: "bg-brand-teal/5",
    hoverBorder: "hover:border-brand-teal/30 hover:text-brand-teal",
    borderL: "border-brand-teal",
    gradient: "teal-blue",
  },
  violet: {
    bg: "bg-brand-violet/10",
    text: "text-brand-violet",
    ring: "bg-brand-violet",
    softBg: "bg-brand-violet/5",
    hoverBorder: "hover:border-brand-violet/30 hover:text-brand-violet",
    borderL: "border-brand-violet",
    gradient: "blue-violet",
  },
};

export function EngineeringServiceDetail({ service }: { service: ServiceCategory }) {
  const accent = ACCENT[(service.accentColor ?? "blue") as AccentKey];
  const eyebrow = service.eyebrow ?? "Implementation Service";
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
            <Link href="/engineering" className="hover:text-heading transition-colors">Implementation Services</Link>
            <span>/</span>
            <span className="text-heading">
              <span className="sm:hidden">{service.shortTitle}</span>
              <span className="hidden sm:inline">{service.title}</span>
            </span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <HeroBackdrop variant="detail" accent={(service.accentColor ?? "blue") as "blue" | "teal" | "violet"} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-xl ${accent.bg} flex items-center justify-center`}>
                <ServiceIcon name={service.icon} className={accent.text} size={24} />
              </div>
              <p className={`text-sm font-semibold uppercase tracking-widest ${accent.text}`}>
                {eyebrow}
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

      {/* SECI Knowledge Spiral — Pillar 1 visual anchor (KM Strategy only) */}
      {service.seciDiagram ? <SECIDiagram /> : null}

      {/* Digital Thread architecture — visual anchor for Requirements Digitalization */}
      {service.digitalThreadDiagram ? <DigitalThreadDiagram /> : null}

      {/* Differentiators Strip */}
      {service.differentiators && service.differentiators.length > 0 && (
        <section className="py-10 border-y border-card-border bg-card-bg/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {service.differentiators.map((diff, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-1 w-5 h-5 rounded-full ${accent.bg} flex items-center justify-center shrink-0`}>
                    <svg className={`w-3 h-3 ${accent.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <section className="py-10 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Implementation <GradientText variant={accent.gradient}>Timeline</GradientText>
            </h2>
            <div className="relative">
              {/* Vertical line */}
              <div className={`absolute left-4 top-0 bottom-0 w-px ${accent.bg} hidden md:block`} />
              <div className="space-y-4">
                {service.implementationTimeline.map((phase, i) => (
                  <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-card-bg border border-card-border md:ml-8 relative">
                    {/* Connector dot */}
                    <div className={`hidden md:block absolute -left-[calc(2rem+4.5px)] top-6 w-2.5 h-2.5 rounded-full ${accent.ring} ring-4 ring-background`} />
                    <div className={`w-10 h-10 rounded-full ${accent.bg} flex items-center justify-center shrink-0`}>
                      <span className={`text-sm font-bold ${accent.text}`}>{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-heading">{phase.phase}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${accent.bg} ${accent.text} font-medium`}>
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
        <section className="py-10 sm:py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Our <GradientText variant={accent.gradient}>Approach</GradientText>
            </h2>
            <div className="space-y-4">
              {service.methodology.map((step, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-card-bg border border-card-border">
                  <div className={`w-8 h-8 rounded-full ${accent.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-sm font-bold ${accent.text}`}>{i + 1}</span>
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
      <section className="py-10 sm:py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-heading mb-8">
            What We <GradientText variant={accent.gradient}>Deliver</GradientText>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {service.deliverables.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-card-bg border border-card-border">
                <div className={`mt-0.5 w-6 h-6 rounded-full ${accent.bg} flex items-center justify-center shrink-0`}>
                  <svg className={`w-3.5 h-3.5 ${accent.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <section className="py-10 sm:py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Technology <GradientText variant={accent.gradient}>Partners</GradientText>
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
        <section className="py-10 sm:py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Who It&apos;s <GradientText variant={accent.gradient}>For</GradientText>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {service.whoItsFor.map((persona, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-card-bg border border-card-border">
                  <div className={`w-2 h-2 rounded-full ${accent.ring} shrink-0`} />
                  <p className="text-sm text-muted">{persona}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Expected Outcomes */}
      {service.expectedOutcomes && service.expectedOutcomes.length > 0 && (
        <section className="py-10 sm:py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Expected <GradientText variant={accent.gradient}>Outcomes</GradientText>
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
        <section className="py-10 sm:py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Illustrative <GradientText variant={accent.gradient}>Projects</GradientText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {service.sampleProjects.map((project) => (
                <div key={project.title} className="p-6 rounded-xl bg-card-bg border border-card-border">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${accent.bg} ${accent.text}`}>{project.industry}</span>
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
        <section className="py-10 sm:py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Engagement <GradientText variant={accent.gradient}>Models</GradientText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {service.engagementModels.map((model) => (
                <div key={model.model} className="p-6 rounded-xl bg-card-bg border border-card-border">
                  <h3 className="text-lg font-semibold text-heading mb-2">{model.model}</h3>
                  <p className="text-sm text-muted mb-4">{model.description}</p>
                  <p className={`text-xs ${accent.text} font-medium`}>{model.typicalDuration}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Platform Spotlight + Implementation Focus + Vendor Landscape */}
      {(service.platformSpotlight ||
        service.implementationFocus ||
        service.vendorLandscape?.length) && (
        <section className="py-10 sm:py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Vendor <GradientText variant={accent.gradient}>Landscape</GradientText>
            </h2>

            {service.platformSpotlight && (
              <PlatformSpotlight spotlight={service.platformSpotlight} />
            )}

            {service.implementationFocus && (
              <aside className={`mb-8 rounded-xl border-l-4 border-brand-teal ${accent.softBg} p-5 sm:p-6`}>
                <p className="text-xs font-bold tracking-[0.2em] text-brand-teal mb-2">
                  {service.implementationFocus.title.toUpperCase()}
                </p>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  {service.implementationFocus.body}
                </p>
                {service.implementationFocus.platforms.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {service.implementationFocus.platforms.map((p) => (
                      <span
                        key={p}
                        className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-teal/15 text-brand-teal border border-brand-teal/30"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </aside>
            )}

            {service.vendorLandscape?.length ? (() => {
              const showExperience = service.vendorLandscape.some((r) => r.experience);
              return (
                <div className="rounded-xl border border-card-border overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead className="bg-brand-navy text-white">
                      <tr>
                        <th className="px-5 py-3 text-left font-bold tracking-wide text-xs uppercase w-1/4">
                          Category
                        </th>
                        <th className="px-5 py-3 text-left font-bold tracking-wide text-xs uppercase">
                          Vendors we evaluate
                        </th>
                        {showExperience && (
                          <th className="px-5 py-3 text-left font-bold tracking-wide text-xs uppercase w-48 hidden md:table-cell">
                            Our delivery role
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {service.vendorLandscape.map((row, i) => {
                        const isPrimary = /primary/i.test(row.experience ?? "");
                        const isDirect = /direct/i.test(row.experience ?? "");
                        const expClass = isPrimary
                          ? "bg-brand-teal/15 text-brand-teal border border-brand-teal/30"
                          : isDirect
                            ? "bg-brand-blue/15 text-brand-blue border border-brand-blue/30"
                            : "bg-card-bg/60 text-muted border border-card-border";
                        return (
                          <tr key={i} className={i % 2 === 0 ? "bg-card-bg" : "bg-card-bg/40"}>
                            <td className="px-5 py-4 align-top text-foreground font-medium">{row.category}</td>
                            <td className="px-5 py-4 align-top text-muted">
                              {row.vendors}
                              {showExperience && row.experience && (
                                <div className="md:hidden mt-2">
                                  <span className={`inline-block text-[11px] font-semibold px-2 py-1 rounded-full ${expClass}`}>
                                    {row.experience}
                                  </span>
                                </div>
                              )}
                            </td>
                            {showExperience && (
                              <td className="px-5 py-4 align-top hidden md:table-cell">
                                {row.experience ? (
                                  <span className={`inline-block text-[11px] font-semibold px-2 py-1 rounded-full ${expClass}`}>
                                    {row.experience}
                                  </span>
                                ) : null}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })() : null}
          </div>
        </section>
      )}

      {/* RAG Architecture Patterns */}
      {service.ragPatterns?.length ? (
        <section className="py-10 sm:py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              RAG Architecture <GradientText variant={accent.gradient}>Patterns</GradientText>
            </h2>
            <ol className="space-y-4 list-none m-0 p-0">
              {service.ragPatterns.map((pattern, i) => (
                <li key={i} className="flex items-start gap-4 p-5 rounded-xl bg-card-bg border border-card-border">
                  <div className={`w-8 h-8 rounded-full ${accent.bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-sm font-bold ${accent.text}`}>{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-heading mb-1">{pattern.title}</h3>
                    <p className="text-sm text-muted leading-relaxed">{pattern.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* Capabilities */}
      <section className="py-10 sm:py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-heading mb-8">Capabilities</h2>
          <div className="flex flex-wrap gap-3">
            {service.focusAreas.map((area) => (
              <span key={area} className={`px-4 py-2 rounded-full bg-card-bg border border-card-border text-sm text-muted ${accent.hoverBorder} transition-colors`}>
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

      {/* Next-step callout — links to the related service in the buyer journey */}
      {service.nextStep ? (
        <section className="py-12 sm:py-16 border-t border-card-border">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <aside
              className={`rounded-xl border-l-4 ${accent.borderL} ${accent.softBg} p-6 sm:p-8`}
            >
              <p
                className={`text-xs font-bold uppercase tracking-wider ${accent.text} mb-2`}
              >
                {service.nextStep.eyebrow}
              </p>
              <h3 className="text-xl sm:text-2xl font-semibold text-heading mb-3">
                {service.nextStep.title}
              </h3>
              <p className="text-muted mb-5 leading-relaxed">
                {service.nextStep.description}
              </p>
              <Button href={service.nextStep.href} size="sm">
                {service.nextStep.ctaLabel}
              </Button>
            </aside>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="py-10 sm:py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-heading mb-4">
            Ready to get started with {service.shortTitle}?
          </h2>
          <p className="text-muted mb-8 max-w-xl mx-auto">
            Every engagement starts with a free diagnostic call. Tell us about your engineering challenges and we&apos;ll scope a tailored solution.
          </p>
          <Button href="/book" size="lg">Schedule a Consultation</Button>
        </div>
      </section>
    </>
  );
}
