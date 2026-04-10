import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/ui/GradientText";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About Us",
  description: `${SITE.name} is a brand of ${SITE.legalEntity}, offering engineering intelligence and research services with deep domain expertise.`,
};

const values = [
  { title: "Domain Expertise", description: "11+ years of deep engagement across energy, engineering, and technology sectors." },
  { title: "Bespoke Intelligence", description: "Every engagement is tailored. No off-the-shelf reports, no generic recommendations." },
  { title: "Real Outcomes", description: "We measure success by the decisions our research enables, not the pages we produce." },
  { title: "Practitioner-Led", description: "Our team has built products, sold to enterprises, and operated in the industries we research." },
];

const credentials = [
  "Published Author: \"Intelligent Energy: Cognitive AI to Augment Human Knowledge\" (SAE International)",
  "CERAWeek Speaker: \"Innovation and Problem Solving Using Cognitive AI\"",
  "CERAWeek Ministerial Panel Moderator: \"India's Green Energy Initiatives\"",
  "SPE/AAPG Speaker: \"Effective Knowledge Management in Energy\"",
  "PMI Speaker: \"Leveraging Data for Cost Optimization\"",
  "2x President's Club Winner -- Top global recognition for revenue and customer impact",
  "GE 6-Sigma Green Belt Certified",
  "Postgraduate AI & ML -- University of Texas, Austin",
  "MBA -- IIM Kozhikode",
];

export default function AboutPage() {
  return (
    <>
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal mb-4">About Us</p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Intelligence that drives <GradientText>real outcomes.</GradientText>
            </h1>
            <p className="mt-6 text-lg text-muted leading-relaxed">
              {SITE.name} is a brand of {SITE.legalEntity}, headquartered in {SITE.locations.primary}. We combine deep domain expertise with rigorous research to deliver bespoke intelligence that helps organizations navigate complexity and act with confidence.
            </p>
            <p className="mt-4 text-lg text-muted leading-relaxed">
              Our team draws on over a decade of direct engagement with the world&apos;s largest engineering organizations, national oil companies, and technology providers -- understanding the engineering realities behind the numbers, not just the market data.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading label="Our Values" title="What We Stand For" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v) => (
              <Card key={v.title} hover={false} className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">{v.title}</h3>
                <p className="text-sm text-muted">{v.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading label="Credentials" title="Recognition & Expertise" />
          <div className="space-y-3 max-w-3xl mx-auto">
            {credentials.map((cred, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-card-bg border border-card-border">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-brand-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-muted">{cred}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Let&apos;s work together</h2>
          <p className="text-muted mb-8">Whether you need bespoke research or engineering consulting, we&apos;re here to help.</p>
          <Button href="/contact" size="lg">Get in Touch</Button>
        </div>
      </section>
    </>
  );
}
