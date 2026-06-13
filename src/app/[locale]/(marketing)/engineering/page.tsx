import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { JsonLd, itemListSchema } from "@/lib/seo/json-ld";

export const metadata: Metadata = {
  title: "Engineering Implementation Services | PLM, Standards, KM | intelle.io",
  description:
    "Implementation services for engineering organizations: Accuris adoption, PLM/ALM (Teamcenter, Windchill, DOORS), Knowledge Management, Standards Advisory. India delivery bench.",
  keywords: [
    "engineering implementation services",
    "PLM ALM consulting",
    "Accuris Workbench adoption",
    "Teamcenter implementation GCC",
    "knowledge management engineering",
    "standards advisory retainer",
  ],
  alternates: { canonical: "/engineering" },
  openGraph: {
    title: "Engineering Implementation Services",
    description:
      "Accuris adoption, PLM/ALM (Teamcenter, Windchill, DOORS), Knowledge Management, Standards Advisory.",
    url: "/engineering",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Engineering Implementation Services" },
};

export default async function EngineeringPage() {
  const t = await getTranslations("engineeringPage");
  return (
    <>
      <JsonLd
        data={itemListSchema(
          ENGINEERING_SERVICES.map((s) => ({
            name: s.title,
            url: s.href,
            description: s.description,
          }))
        )}
      />
      <section className="relative overflow-hidden py-20 sm:py-24 lg:py-28">
        <HeroBackdrop variant="blue" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-blue mb-4">
            {t("heroEyebrow")}
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-heading">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label={t("headingLabel")}
          title={t("headingTitle")}
          description={t("headingDesc")}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ENGINEERING_SERVICES.map((service) => (
            <Card key={service.id} href={service.href} className="p-6">
              <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center mb-4">
                <ServiceIcon name={service.icon} className="text-brand-blue" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-heading mb-2">{service.title}</h3>
              <p className="text-sm text-muted">{service.description}</p>
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
