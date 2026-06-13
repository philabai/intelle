import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { JsonLd, itemListSchema } from "@/lib/seo/json-ld";

export const metadata: Metadata = {
  title: "Engineering Research Services | GCC, India & Global | intelle.io",
  description:
    "Senior-led engineering research services across 7 specialty areas: energy, standards, AI, technology scouting, market intelligence, patent IP, strategic engagements. Practitioner-grade.",
  keywords: [
    "engineering research services GCC",
    "energy research consultancy",
    "standards research GCC",
    "industrial AI research",
    "technology scouting NOC",
    "M&A diligence engineering",
  ],
  alternates: { canonical: "/research" },
  openGraph: {
    title: "Engineering Research & Innovation Services",
    description:
      "Senior-led research across 7 specialty areas: energy, standards, AI, technology scouting, market intel, patent IP, strategic.",
    url: "/research",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Engineering Research & Innovation Services" },
};

export default function ResearchPage() {
  return (
    <>
      <JsonLd
        data={itemListSchema(
          RESEARCH_SERVICES.map((s) => ({
            name: s.title,
            url: s.href,
            description: s.description,
          }))
        )}
      />
      <section className="relative overflow-hidden py-20 sm:py-24 lg:py-28">
        <HeroBackdrop variant="teal" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal mb-4">
            Research &amp; Innovation Services
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-heading">
            Bespoke intelligence, delivered fast.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            Seven specialty areas — energy, standards, AI, technology scouting, market
            intelligence, patent IP, and strategic engagements — led personally by a
            senior practitioner.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            label="Research & Innovation"
            title="Seven Service Categories"
            description="Spanning the full research and innovation lifecycle"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {RESEARCH_SERVICES.map((service) => (
              <Card key={service.id} href={service.href} className="p-6">
                <div className="w-10 h-10 rounded-lg bg-brand-teal/10 flex items-center justify-center mb-4">
                  <ServiceIcon name={service.icon} className="text-brand-teal" size={20} />
                </div>
                <h3 className="text-lg font-semibold text-heading mb-2">{service.title}</h3>
                <p className="text-sm text-muted line-clamp-3">{service.description}</p>
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
    </>
  );
}
