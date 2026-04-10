import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/ui/GradientText";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About Us",
  description: `${SITE.name} is a brand of ${SITE.legalEntity}, offering engineering intelligence and research services with deep domain expertise across energy, standards, AI, and engineering.`,
};

const values = [
  {
    title: "Domain Expertise",
    description:
      "11+ years of deep engagement across energy, engineering, and technology sectors. We understand the engineering realities behind the numbers, not just the market data.",
  },
  {
    title: "Bespoke Intelligence",
    description:
      "Every engagement is tailored. No off-the-shelf reports, no generic recommendations. We deliver intelligence designed for your specific decision.",
  },
  {
    title: "Real Outcomes",
    description:
      "We measure success by the decisions our research enables and the outcomes those decisions produce -- not the pages we deliver.",
  },
  {
    title: "Practitioner-Led",
    description:
      "Our team has built products, sold to enterprises, and operated in the industries we research. We bring practitioner depth, not analyst distance.",
  },
];

const methodology = [
  {
    step: "Intelligence Requirements Definition",
    description:
      "We start by understanding what you actually need to decide. Not a generic research brief, but a structured scoping of the specific intelligence that will drive your decision.",
  },
  {
    step: "Multi-Source Research",
    description:
      "We draw on proprietary databases, public datasets (IEA, IRENA, ISO catalogs, USPTO), expert networks, and primary interviews. Every data point is sourced and verified.",
  },
  {
    step: "Practitioner Validation",
    description:
      "Findings are reviewed through the lens of someone who has operated in the industry -- not just researched it. This is where generic consulting fails and practitioner-led intelligence excels.",
  },
  {
    step: "Actionable Delivery",
    description:
      "We deliver decision-ready intelligence documents, not shelfware. Every deliverable is designed to answer a specific question and enable a specific action.",
  },
  {
    step: "Ongoing Advisory",
    description:
      "Our relationship doesn't end with the deliverable. We remain available for follow-up questions, updated analysis, and strategic guidance as your situation evolves.",
  },
];

const engagementProcess = [
  {
    step: "01",
    title: "Diagnostic Call",
    description: "Free, no-obligation 30-minute call to understand your challenge and identify how we can help.",
  },
  {
    step: "02",
    title: "Scoping & Proposal",
    description: "We develop a detailed scope of work, timeline, and fee estimate tailored to your specific needs.",
  },
  {
    step: "03",
    title: "Research & Delivery",
    description: "We execute the engagement with iterative check-ins, delivering intelligence on time and on scope.",
  },
  {
    step: "04",
    title: "Advisory & Follow-Up",
    description: "Post-delivery briefing and ongoing availability for questions, updates, and strategic guidance.",
  },
];

const credentialCategories = [
  {
    category: "Publications & Speaking",
    items: [
      "Published Author: \"Intelligent Energy: Cognitive AI to Augment Human Knowledge\" (SAE International)",
      "CERAWeek Speaker: \"Innovation and Problem Solving Using Cognitive AI\"",
      "CERAWeek Ministerial Panel Moderator: \"India's Green Energy Initiatives\"",
      "SPE/AAPG Speaker: \"Effective Knowledge Management in Energy\"",
      "PMI Speaker: \"Leveraging Data for Cost Optimization\"",
      "India R&D Conclave: Key Speaker on AI & Digitalization for Green Energy",
    ],
  },
  {
    category: "Professional Recognition",
    items: [
      "2x President's Club Winner -- Top global recognition for revenue and customer impact",
      "GE 6-Sigma Green Belt Certified",
      "65+ enterprise customer relationships built over 11 years",
    ],
  },
  {
    category: "Education",
    items: [
      "Postgraduate AI & ML -- University of Texas at Austin",
      "MBA -- Indian Institute of Management (IIM) Kozhikode",
      "M.S. Computer Science -- Jadavpur University",
    ],
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal mb-4">
              About Us
            </p>
            <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Intelligence that drives{" "}
              <GradientText>real outcomes.</GradientText>
            </h1>
            <p className="mt-6 text-lg text-muted leading-relaxed">
              {SITE.name} is a brand of {SITE.legalEntity}, headquartered in{" "}
              {SITE.locations.primary}. We combine deep domain expertise with
              rigorous research to deliver bespoke intelligence that helps
              organizations navigate complexity and act with confidence.
            </p>
            <p className="mt-4 text-lg text-muted leading-relaxed">
              Our team draws on over a decade of direct engagement with the
              world&apos;s largest engineering organizations, national oil
              companies, and technology providers -- understanding the
              engineering realities behind the numbers, not just the market data.
            </p>
          </div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <SectionHeading
                label="Our Story"
                title="From Product Builder to Intelligence Partner"
              />
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  intelle.io was founded by Arnab Ghosh, who spent over 11 years
                  at the intersection of engineering intelligence and enterprise
                  technology -- first at IHS Markit, then through the S&P Global
                  acquisition, and finally at Accuris (the engineering
                  intelligence business carved out from S&P Global).
                </p>
                <p>
                  During that time, Arnab built the product roadmap for the
                  Engineering Workbench, defined 7 AI workflows for engineering
                  standards management, ran customer discovery across 65+
                  enterprise accounts, and was recognized twice with the
                  President&apos;s Club award for revenue impact and customer
                  adoption.
                </p>
                <p>
                  But the deeper insight was this:{" "}
                  <span className="text-white font-medium">
                    enterprises don&apos;t just need software -- they need
                    intelligence.
                  </span>{" "}
                  They need someone who understands their engineering context,
                  can research their specific market, and deliver actionable
                  recommendations. The big consulting firms charge too much for
                  generic work. The niche analysts lack practitioner depth.
                </p>
                <p>
                  intelle.io fills that gap:{" "}
                  <span className="text-white font-medium">
                    practitioner-led, bespoke intelligence
                  </span>{" "}
                  for organizations that need real answers, not polished slide
                  decks.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-card-bg border border-card-border">
                <p className="text-3xl font-bold gradient-text">11+</p>
                <p className="text-sm text-muted mt-1">
                  Years at IHS Markit / S&P Global / Accuris
                </p>
              </div>
              <div className="p-6 rounded-xl bg-card-bg border border-card-border">
                <p className="text-3xl font-bold gradient-text">65+</p>
                <p className="text-sm text-muted mt-1">
                  Enterprise accounts directly served
                </p>
              </div>
              <div className="p-6 rounded-xl bg-card-bg border border-card-border">
                <p className="text-3xl font-bold gradient-text">2x</p>
                <p className="text-sm text-muted mt-1">
                  President&apos;s Club Winner -- top global recognition
                </p>
              </div>
              <div className="p-6 rounded-xl bg-card-bg border border-card-border">
                <p className="text-3xl font-bold gradient-text">7</p>
                <p className="text-sm text-muted mt-1">
                  AI workflows defined for engineering intelligence
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading label="Our Values" title="What We Stand For" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v) => (
              <Card key={v.title} hover={false} className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {v.title}
                </h3>
                <p className="text-sm text-muted">{v.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Our Methodology"
            title="How We Deliver Intelligence"
          />
          <div className="space-y-4 max-w-3xl mx-auto">
            {methodology.map((m, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-5 rounded-xl bg-card-bg border border-card-border"
              >
                <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-brand-teal">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    {m.step}
                  </h3>
                  <p className="text-sm text-muted mt-1">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engagement Process */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Working With Us"
            title="The Engagement Process"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {engagementProcess.map((p) => (
              <div
                key={p.step}
                className="relative p-6 rounded-xl bg-card-bg border border-card-border"
              >
                <p className="text-4xl font-bold text-brand-teal/20 mb-3">
                  {p.step}
                </p>
                <h3 className="text-base font-semibold text-white mb-2">
                  {p.title}
                </h3>
                <p className="text-sm text-muted">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credentials */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Credentials"
            title="Recognition & Expertise"
          />
          <div className="space-y-8 max-w-3xl mx-auto">
            {credentialCategories.map((cat) => (
              <div key={cat.category}>
                <h3 className="text-lg font-semibold text-white mb-4">
                  {cat.category}
                </h3>
                <div className="space-y-3">
                  {cat.items.map((cred, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-4 rounded-lg bg-card-bg border border-card-border"
                    >
                      <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
                        <svg
                          className="w-3.5 h-3.5 text-brand-teal"
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
                      </div>
                      <p className="text-sm text-muted">{cred}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Served */}
      <section className="py-12 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm uppercase tracking-widest text-muted mb-6">
            Industries We Serve
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "Oil & Gas",
              "Aerospace & Defense",
              "Medical Devices",
              "Manufacturing",
            ].map((ind) => (
              <span
                key={ind}
                className="px-5 py-2 rounded-full bg-card-bg border border-card-border text-sm text-muted"
              >
                {ind}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Let&apos;s work together
          </h2>
          <p className="text-muted mb-8 max-w-xl mx-auto">
            Whether you need bespoke research, engineering consulting, or
            strategic intelligence -- every engagement starts with a free
            diagnostic call.
          </p>
          <Button href="/contact" size="lg">
            Get in Touch
          </Button>
        </div>
      </section>
    </>
  );
}
