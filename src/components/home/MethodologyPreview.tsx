import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GradientText } from "@/components/ui/GradientText";

export async function MethodologyPreview() {
  const t = await getTranslations("home");
  const steps = [
    { num: "01", title: t("methodStep1Title"), description: t("methodStep1Desc") },
    { num: "02", title: t("methodStep2Title"), description: t("methodStep2Desc") },
    { num: "03", title: t("methodStep3Title"), description: t("methodStep3Desc") },
    { num: "04", title: t("methodStep4Title"), description: t("methodStep4Desc") },
  ];
  return (
    <section className="py-16 border-t border-card-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-teal mb-3">
            {t("methodEyebrow")}
          </p>
          <h2 className="text-2xl font-bold text-heading sm:text-3xl">
            {t.rich("methodTitle", {
              grad: (chunks) => <GradientText>{chunks}</GradientText>,
            })}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative p-6 rounded-xl bg-card-bg border border-card-border"
            >
              <p className="text-4xl font-bold text-brand-teal/20 mb-3">
                {step.num}
              </p>
              <h3 className="text-base font-semibold text-heading mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            href="/about"
            className="text-sm text-brand-teal hover:text-brand-teal/80 transition-colors"
          >
            {t("methodLink")}
          </Link>
        </div>
      </div>
    </section>
  );
}
