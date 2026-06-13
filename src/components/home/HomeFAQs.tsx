import { getTranslations } from "next-intl/server";
import { FAQSection } from "@/components/seo/FAQSection";
import { JsonLd, faqSchema } from "@/lib/seo/json-ld";
import type { FAQ } from "@/lib/types";

export async function HomeFAQs() {
  const t = await getTranslations("home");
  const HOME_FAQS: FAQ[] = [
    { q: t("faq1Q"), a: t("faq1A") },
    { q: t("faq2Q"), a: t("faq2A") },
    { q: t("faq3Q"), a: t("faq3A") },
    { q: t("faq4Q"), a: t("faq4A") },
    { q: t("faq5Q"), a: t("faq5A") },
  ];
  return (
    <>
      <JsonLd data={faqSchema(HOME_FAQS)} />
      <section className="py-16 sm:py-20 border-t border-card-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <FAQSection faqs={HOME_FAQS} title={t("faqsTitle")} />
        </div>
      </section>
    </>
  );
}
