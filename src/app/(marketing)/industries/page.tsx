import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { INDUSTRIES } from "@/lib/constants";
import { JsonLd, itemListSchema } from "@/lib/seo/json-ld";

export const metadata: Metadata = {
  title: "Industries Served | Oil & Gas, Aerospace, MedDev, Manufacturing | intelle.io",
  description:
    "intelle.io serves Oil & Gas, Aerospace & Defense, Medical Devices, and Advanced Manufacturing across GCC, India, and global markets. Senior practitioner depth.",
  keywords: [
    "engineering consultant by industry",
    "oil gas consultancy GCC",
    "aerospace defense engineering research",
    "medical device research",
    "advanced manufacturing consulting",
  ],
  alternates: { canonical: "/industries" },
  openGraph: {
    title: "Industries Served by intelle.io",
    description:
      "Oil & Gas, Aerospace & Defense, Medical Devices, Advanced Manufacturing across GCC, India, and global markets.",
    url: "/industries",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Industries We Serve" },
};

export default function IndustriesPage() {
  return (
    <>
      <JsonLd
        data={itemListSchema(
          INDUSTRIES.map((i) => ({
            name: i.title,
            url: i.href,
            description: i.description,
          }))
        )}
      />
      <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Industries"
          title="Deep Domain Expertise"
          description="Published author, conference speaker, and recognized expert across four major industry verticals"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {INDUSTRIES.map((industry) => (
            <Card key={industry.id} href={industry.href} className="p-8">
              <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center mb-4">
                <ServiceIcon name={industry.icon} className="text-brand-blue" size={24} />
              </div>
              <h3 className="text-xl font-semibold text-heading mb-3">{industry.title}</h3>
              <p className="text-muted text-sm mb-4">{industry.description}</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted/60 mb-2">Key Standards</p>
                  <div className="flex flex-wrap gap-1.5">
                    {industry.standards.map((std) => (
                      <span key={std} className="text-xs px-2 py-0.5 rounded-full bg-card-border text-muted">{std}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}
