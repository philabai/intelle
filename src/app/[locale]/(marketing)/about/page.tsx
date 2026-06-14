import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/ui/GradientText";
import { Button } from "@/components/ui/Button";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";
import { SITE } from "@/lib/constants";
import { JsonLd, personSchema } from "@/lib/seo/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: t("about.title"),
    description: t("about.description"),
    keywords: [
      "engineering research practice Dubai",
      "Arnab Ghosh founder",
      "intelle.io about",
      "SAE engineering author",
      "CERAWeek speaker",
      "KKR Accuris alumni",
      "S&P Global IHS Markit engineering",
    ],
    alternates: { canonical: "/about" },
    openGraph: {
      title: t("about.ogTitle"),
      description: t("about.ogDescription"),
      url: "/about",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("about.ogTitle"),
    },
  };
}

export default async function AboutPage() {
  const t = await getTranslations("about");
  const emph = (chunks: React.ReactNode) => (
    <span className="text-heading font-medium">{chunks}</span>
  );

  const values = [
    { title: t("value1Title"), description: t("value1Desc") },
    { title: t("value2Title"), description: t("value2Desc") },
    { title: t("value3Title"), description: t("value3Desc") },
    { title: t("value4Title"), description: t("value4Desc") },
  ];
  const methodology = [
    { step: t("method1Title"), description: t("method1Desc") },
    { step: t("method2Title"), description: t("method2Desc") },
    { step: t("method3Title"), description: t("method3Desc") },
    { step: t("method4Title"), description: t("method4Desc") },
    { step: t("method5Title"), description: t("method5Desc") },
  ];
  const engagementProcess = [
    { step: "01", title: t("engage1Title"), description: t("engage1Desc") },
    { step: "02", title: t("engage2Title"), description: t("engage2Desc") },
    { step: "03", title: t("engage3Title"), description: t("engage3Desc") },
    { step: "04", title: t("engage4Title"), description: t("engage4Desc") },
  ];
  const founderHighlights = [
    t("highlight1"),
    t("highlight2"),
    t("highlight3"),
    t("highlight4"),
    t("highlight5"),
    t("highlight6"),
  ];
  const networkPartners = [
    { title: t("network1Title"), stat: "300+", description: t("network1Desc") },
    { title: t("network2Title"), stat: "4", description: t("network2Desc") },
    { title: t("network3Title"), stat: "Global", description: t("network3Desc") },
    { title: t("network4Title"), stat: "10+", description: t("network4Desc") },
  ];
  const industriesServed = [
    t("industryOilGas"),
    t("industryAerospace"),
    t("industryMedical"),
    t("industryManufacturing"),
  ];

  return (
    <>
      <JsonLd
        data={personSchema({
          name: "Arnab Ghosh",
          jobTitle: "Founder & CEO",
          alumniOf: [
            "S&P Global",
            "IHS Markit",
            "GE Energy",
            "Accuris (KKR portfolio company)",
            "Sapient Consulting",
          ],
          knowsAbout: [
            "Industrial AI",
            "Cognitive operations",
            "Energy transition",
            "Hydrogen economy",
            "CCUS",
            "Standards & regulations",
            "PLM / ALM",
            "Knowledge management",
            "Patent intelligence",
            "Technology scouting",
          ],
          description:
            "Senior practitioner with 25+ years across S&P Global, IHS Markit, GE Energy, Accuris (a KKR portfolio company), and Sapient Consulting. SAE-published on industrial AI and cognitive operations. CERAWeek-invited speaker. Fortune 500 reference engagements with Aramco, ADNOC, Shell, Chevron, Honeywell, Baker Hughes, and GE Energy.",
        })}
      />
      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <HeroBackdrop variant="teal" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal mb-4">
              {t("heroEyebrow")}
            </p>
            <h1 className="text-3xl font-bold text-heading sm:text-4xl lg:text-5xl">
              {t.rich("heroTitle", {
                grad: (chunks) => <GradientText>{chunks}</GradientText>,
              })}
            </h1>
            <p className="mt-6 text-lg text-muted leading-relaxed">
              {t("heroPara1", {
                name: SITE.name,
                entity: SITE.legalEntity,
                location: SITE.locations.primary,
              })}
            </p>
            <p className="mt-4 text-lg text-muted leading-relaxed">
              {t("heroPara2")}
            </p>
          </div>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <SectionHeading label={t("storyLabel")} title={t("storyTitle")} />
              <div className="space-y-4 text-muted leading-relaxed">
                <p>{t("storyPara1")}</p>
                <p>{t("storyPara2")}</p>
                <p>{t.rich("storyPara3", { emph })}</p>
                <p>{t.rich("storyPara4", { emph })}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-card-bg border border-card-border">
                <p className="text-3xl font-bold gradient-text">25+</p>
                <p className="text-sm text-muted mt-1">{t("stat25Years")}</p>
              </div>
              <div className="p-6 rounded-xl bg-card-bg border border-card-border">
                <p className="text-3xl font-bold gradient-text">Fortune 500</p>
                <p className="text-sm text-muted mt-1">{t("statFortune500")}</p>
              </div>
              <div className="p-6 rounded-xl bg-card-bg border border-card-border">
                <p className="text-3xl font-bold gradient-text">65+</p>
                <p className="text-sm text-muted mt-1">{t("stat65Orgs")}</p>
              </div>
              <div className="p-6 rounded-xl bg-card-bg border border-card-border">
                <p className="text-3xl font-bold gradient-text">3</p>
                <p className="text-sm text-muted mt-1">{t("stat3Domains")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 border-t border-card-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading label={t("valuesLabel")} title={t("valuesTitle")} />
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
            label={t("methodologyLabel")}
            title={t("methodologyTitle")}
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
            label={t("engagementLabel")}
            title={t("engagementTitle")}
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
            label={t("leadershipLabel")}
            title={t("leadershipTitle")}
          />
          <div className="max-w-3xl mx-auto">
            <p className="text-muted leading-relaxed mb-6">
              {t("leadershipPara")}
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
          <SectionHeading label={t("networkLabel")} title={t("networkTitle")} />
          <p className="text-muted leading-relaxed mb-8 max-w-3xl mx-auto">
            {t("networkPara")}
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
            {t("industriesServed")}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {industriesServed.map((ind) => (
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
            {t("ctaTitle")}
          </h2>
          <p className="text-muted mb-8 max-w-xl mx-auto">{t("ctaPara")}</p>
          <Button href="/book" size="lg">
            {t("ctaButton")}
          </Button>
        </div>
      </section>
    </>
  );
}
