import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { GradientText } from "@/components/ui/GradientText";

export async function CTASection() {
  const t = await getTranslations("home");
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/10 via-transparent to-brand-teal/10 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-heading sm:text-4xl">
          {t.rich("ctaTitle", {
            grad: (chunks) => <GradientText>{chunks}</GradientText>,
          })}
        </h2>
        <p className="mt-4 text-lg text-muted max-w-2xl mx-auto">
          {t("ctaSubtitle")}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button href="/book" size="lg">
            {t("ctaPrimary")}
          </Button>
          <Button href="/about" variant="outline" size="lg">
            {t("ctaSecondary")}
          </Button>
        </div>
      </div>
    </section>
  );
}
