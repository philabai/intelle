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

const founderHighlights = [
  "Published in SAE International on Cognitive AI in engineering",
  "CERAWeek speaker and ministerial panel moderator",
  "SPE/AAPG and PMI conference presenter",
  "2x President's Club recognition for enterprise impact",
  "GE 6-Sigma Green Belt methodology trained",
  "AI & ML (UT Austin) | MBA (IIM Kozhikode) | CS (Jadavpur University)",
];

const networkPartners = [
  {
    title: "Implementation Delivery",
    stat: "300+",
    description: "Engineers available through our offshore delivery partnership for PLM/ALM integration, API development, and large-scale implementation projects.",
  },
  {
    title: "Domain Expert Network",
    stat: "4",
    description: "Industry verticals covered through our network of subject matter experts spanning energy, aerospace, medical devices, and manufacturing.",
  },
  {
    title: "Research Reach",
    stat: "Global",
    description: "Access to proprietary databases, SDO publications, patent offices (USPTO, EPO, WIPO), and institutional research partnerships.",
  },
  {
    title: "Standards Bodies",
    stat: "10+",
    description: "Deep familiarity with ISO, IEC, API, ASME, ASTM, MIL-STD, FDA, EU MDR, NACE, and national standards organizations across GCC and beyond.",
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
            <h1 className="text-3xl font-bold text-heading sm:text-4xl lg:text-5xl">
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
                title="Industry. Technology. AI."
              />
              <div className="space-y-4 text-muted leading-relaxed">
                <p>
                  intelle.io was founded by Arnab Ghosh -- a practitioner who
                  has spent 25+ years at the intersection of industry,
                  technology, and AI.
                </p>
                <p>
                  From Sapient Consulting and GE Energy to Dell-EMC, IHS
                  Markit, S&amp;P Global, and lately Accuris, Arnab has worked
                  across the full arc of enterprise technology -- helping
                  organizations in Energy, Aerospace &amp; Defense, and Digital
                  Manufacturing turn complex data into decisions. He has advised
                  Fortune 500 companies including Saudi Aramco, ADNOC, QP, KPC,
                  Boeing, NASA, Shell, and Chevron to name a few, earning his
                  customers&apos; trust for measurable impact.
                </p>
                <p>
                  That experience revealed a consistent gap:{" "}
                  <span className="text-heading font-medium">
                    enterprises don&apos;t just need software or data platforms
                    -- they need intelligence.
                  </span>{" "}
                  Someone who understands their context, can research their
                  specific needs, and deliver recommendations they can act on.
                  The global consultancies charge a premium for generic work.
                  The niche analysts lack practitioner depth. And the platform
                  vendors stop at the login screen.
                </p>
                <p>
                  intelle.io fills that gap --{" "}
                  <span className="text-heading font-medium">
                    practitioner-led, bespoke intelligence
                  </span>{" "}
                  for organizations that need real answers, not polished slide
                  decks.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-card-bg border border-card-border">
                <p className="text-3xl font-bold gradient-text">25+</p>
                <p className="text-sm text-muted mt-1">
                  Years at the intersection of industry, technology &amp; AI
                </p>
              </div>
              <div className="p-6 rounded-xl bg-card-bg border border-card-border">
                <p className="text-3xl font-bold gradient-text">Fortune 500</p>
                <p className="text-sm text-muted mt-1">
                  Clients advised -- Aramco, ADNOC, Boeing, NASA, Shell &amp; more
                </p>
              </div>
              <div className="p-6 rounded-xl bg-card-bg border border-card-border">
                <p className="text-3xl font-bold gradient-text">2x</p>
                <p className="text-sm text-muted mt-1">
                  President&apos;s Club Winner -- recognized for measurable customer impact
                </p>
              </div>
              <div className="p-6 rounded-xl bg-card-bg border border-card-border">
                <p className="text-3xl font-bold gradient-text">3</p>
                <p className="text-sm text-muted mt-1">
                  Core domains: Energy, Aerospace &amp; Defense, Digital Manufacturing
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
                <h3 className="text-lg font-semibold text-heading mb-2">
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
                  <h3 className="text-base font-semibold text-heading">
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
                <h3 className="text-base font-semibold text-heading mb-2">
                  {p.title}
                </h3>
                <p className="text-sm text-muted">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Leadership"
            title="Founded by a Practitioner"
          />
          <div className="max-w-3xl mx-auto">
            <p className="text-muted leading-relaxed mb-6">
              Our founding team brings 25+ years of experience across Sapient,
              GE Energy, Dell-EMC, IHS Markit, S&amp;P Global, and Accuris --
              combining deep industry knowledge with enterprise technology and
              AI expertise to serve clients across energy, aerospace, and
              manufacturing.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {founderHighlights.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-card-bg border border-card-border"
                >
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-brand-teal/10 flex items-center justify-center shrink-0">
                    <svg
                      className="w-3 h-3 text-brand-teal"
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
                  <p className="text-sm text-muted">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Network */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Our Network"
            title="Depth Beyond a Single Firm"
          />
          <p className="text-muted leading-relaxed mb-8 max-w-3xl mx-auto">
            intelle.io combines senior-level advisory with a network of delivery
            partners, domain experts, and research capabilities that allow us to
            scale engagements without sacrificing quality.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {networkPartners.map((partner) => (
              <Card key={partner.title} hover={false} className="p-6 text-center">
                <p className="text-3xl font-bold gradient-text mb-2">
                  {partner.stat}
                </p>
                <h3 className="text-base font-semibold text-heading mb-2">
                  {partner.title}
                </h3>
                <p className="text-xs text-muted">{partner.description}</p>
              </Card>
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
          <h2 className="text-2xl font-bold text-heading mb-4">
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
