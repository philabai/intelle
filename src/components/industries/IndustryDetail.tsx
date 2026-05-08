import Link from "next/link";
import type { IndustryInfo } from "@/lib/types";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/ui/GradientText";
import { TldrCallout } from "@/components/seo/TldrCallout";
import { FAQSection } from "@/components/seo/FAQSection";
import { JsonLd, faqSchema } from "@/lib/seo/json-ld";

export function IndustryDetail({ industry }: { industry: IndustryInfo }) {
  return (
    <>
      {industry.faqs?.length ? <JsonLd data={faqSchema(industry.faqs)} /> : null}
      {/* Breadcrumb */}
      <div className="border-b border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted">
            <Link href="/" className="hover:text-heading transition-colors">Home</Link>
            <span>/</span>
            <Link href="/industries" className="hover:text-heading transition-colors">Industries</Link>
            <span>/</span>
            <span className="text-heading">{industry.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                <ServiceIcon name={industry.icon} className="text-brand-blue" size={24} />
              </div>
              {industry.heroSubtitle && (
                <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal">
                  {industry.heroSubtitle}
                </p>
              )}
            </div>
            <h1 className="text-3xl font-bold text-heading sm:text-4xl lg:text-5xl">
              {industry.title}
            </h1>
            <p className="mt-6 text-lg text-muted leading-relaxed">
              {industry.description}
            </p>
            {industry.tldr?.length ? <TldrCallout items={industry.tldr} /> : null}
          </div>
        </div>
      </section>

      {/* Key Statistics */}
      {industry.keyStats && industry.keyStats.length > 0 && (
        <section className="py-12 border-y border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {industry.keyStats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold gradient-text">{stat.value}</p>
                  <p className="mt-1 text-sm text-muted">{stat.label}</p>
                  {stat.source && (
                    <p className="mt-0.5 text-xs text-muted/40">{stat.source}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Industry Challenges */}
      {industry.challenges && industry.challenges.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Key <GradientText>Challenges</GradientText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {industry.challenges.map((challenge) => (
                <Card key={challenge.title} hover={false} className="p-6">
                  <h3 className="text-lg font-semibold text-heading mb-2">
                    {challenge.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {challenge.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Industry Trends */}
      {industry.trends && industry.trends.length > 0 && (
        <section className="py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Industry <GradientText>Trends</GradientText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {industry.trends.map((trend) => (
                <div
                  key={trend.title}
                  className="p-6 rounded-xl bg-card-bg border border-card-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-heading mb-2">
                        {trend.title}
                      </h3>
                      <p className="text-sm text-muted leading-relaxed">
                        {trend.description}
                      </p>
                    </div>
                    {trend.stat && (
                      <div className="shrink-0 text-right">
                        <p className="text-2xl font-bold text-brand-teal">
                          {trend.stat}
                        </p>
                        {trend.statSource && (
                          <p className="text-xs text-muted/40 mt-0.5">
                            {trend.statSource}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How We Help */}
      {industry.howWeHelp && industry.howWeHelp.length > 0 && (
        <section className="py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              How intelle.io <GradientText>Helps</GradientText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {industry.howWeHelp.map((item) => (
                <div
                  key={item.title}
                  className="p-6 rounded-xl bg-card-bg border border-card-border hover:border-brand-blue/30 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-heading mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed mb-4">
                    {item.description}
                  </p>
                  {item.serviceHref && (
                    <Link
                      href={item.serviceHref}
                      className="text-sm text-brand-teal hover:text-brand-teal/80 transition-colors"
                    >
                      Learn more &rarr;
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Use Cases */}
      {industry.useCases && industry.useCases.length > 0 && (
        <section className="py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Illustrative <GradientText>Use Cases</GradientText>
            </h2>
            <div className="space-y-6">
              {industry.useCases.map((useCase) => (
                <div
                  key={useCase.title}
                  className="p-6 rounded-xl bg-card-bg border border-card-border"
                >
                  <h3 className="text-lg font-semibold text-heading mb-2">
                    {useCase.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed mb-4">
                    {useCase.description}
                  </p>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-teal/5 border border-brand-teal/10">
                    <svg
                      className="w-4 h-4 text-brand-teal mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <p className="text-sm text-brand-teal/80">
                      <span className="font-medium text-brand-teal">Outcome:</span>{" "}
                      {useCase.outcome}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Standards Deep Dive */}
      {industry.standardsDetail && industry.standardsDetail.length > 0 && (
        <section className="py-16 border-t border-card-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-heading mb-8">
              Standards We <GradientText>Cover</GradientText>
            </h2>
            <div className="space-y-3">
              {industry.standardsDetail.map((std) => (
                <div
                  key={std.code}
                  className="flex items-start gap-4 p-4 rounded-lg bg-card-bg border border-card-border"
                >
                  <span className="shrink-0 px-3 py-1 rounded-full bg-brand-teal/10 text-brand-teal text-sm font-mono font-medium">
                    {std.code}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-heading">{std.fullName}</p>
                    <p className="text-sm text-muted mt-0.5">{std.relevance}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {industry.faqs?.length ? (
        <section className="py-8 border-t border-card-border">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <FAQSection faqs={industry.faqs} />
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-heading mb-4">
            Ready to discuss your {industry.title.toLowerCase()} intelligence needs?
          </h2>
          <p className="text-muted mb-8 max-w-xl mx-auto">
            Every engagement starts with a free, no-obligation diagnostic call to
            identify your needs and explore how we can help.
          </p>
          <Button href="/contact" size="lg">
            Schedule a Consultation
          </Button>
        </div>
      </section>
    </>
  );
}
