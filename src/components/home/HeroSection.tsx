import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { GradientText } from "@/components/ui/GradientText";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";

export async function HeroSection() {
  const t = await getTranslations("home");
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
      <HeroBackdrop variant="full" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal mb-6">
            {t("heroEyebrow")}
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-heading sm:text-5xl lg:text-6xl">
            {t.rich("heroTitle", {
              grad: (chunks) => <GradientText>{chunks}</GradientText>,
            })}
          </h1>
          <p className="mt-6 text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            {t("heroSubtitle")}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button href="/book" size="lg">
              {t("heroCtaPrimary")}
            </Button>
            <Button href="/research" variant="outline" size="lg">
              {t("heroCtaSecondary")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
