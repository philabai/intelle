import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalEmbed } from "@/components/scheduling/CalEmbed";
import { SITE } from "@/lib/constants";
import { FAQSection } from "@/components/seo/FAQSection";
import { JsonLd, faqSchema } from "@/lib/seo/json-ld";
import type { FAQ } from "@/lib/types";

export const metadata: Metadata = {
  title: "Book a 30-Min Discovery Call | intelle.io Engineering Research",
  description:
    "Book a free 30-minute discovery call with intelle.io. Scope an engineering research, AI readiness, standards, or M&A diligence engagement. Zoom auto-attached. SOW within 48 hours.",
  keywords: [
    "engineering research discovery call",
    "free engineering consultation",
    "scope engineering research engagement",
    "AI readiness call",
    "intelle.io booking",
  ],
  alternates: { canonical: "/book" },
  openGraph: {
    title: "Book a 30-Minute Discovery Call",
    description:
      "Free 30-minute call to scope a research or implementation engagement. Zoom auto-attached.",
    url: "/book",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Book a 30-Minute Discovery Call" },
};

export default function BookPage() {
  const t = useTranslations("bookPage");
  const calLink = `${SITE.calcom.username}/${SITE.calcom.introCallSlug}`;

  const BOOK_FAQS: FAQ[] = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
    { q: t("faq5Q"), a: t("faq5A") },
  ];

  return (
    <>
      <JsonLd data={faqSchema(BOOK_FAQS)} />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-heading mb-3">
              {t("title")}
            </h1>
            <p className="text-muted">
              {t("slotParagraph")}
            </p>
          </div>

          <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden h-[680px] sm:h-[760px]">
            <CalEmbed calLink={calLink} className="h-full w-full" />
          </div>

          <p className="text-sm text-muted/70 mt-4">
            {t.rich("notReady", {
              email: SITE.email,
              contact: (c) => (
                <Link href="/contact" className="text-brand-teal hover:underline">
                  {c}
                </Link>
              ),
              mail: (c) => (
                <a href={`mailto:${SITE.email}`} className="text-brand-teal hover:underline">
                  {c}
                </a>
              ),
            })}
          </p>

          <div className="mt-12">
            <FAQSection faqs={BOOK_FAQS} title={t("faqTitle")} />
          </div>
        </div>
      </section>
    </>
  );
}
