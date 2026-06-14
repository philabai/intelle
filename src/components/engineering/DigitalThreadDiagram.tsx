import { useTranslations } from "next-intl";
import { GradientText } from "@/components/ui/GradientText";

type SourceChip = { labelKey: string; example?: string; exampleKey?: string };

const SOURCE_CHIPS: SourceChip[] = [
  { labelKey: "sourceIndustryStandards", example: "API · ISO · NACE · ASME · IEC" },
  { labelKey: "sourceMilSpecs", example: "Mil-Spec · NATO · AIA" },
  { labelKey: "sourceRegulations", exampleKey: "sourceRegulationsExample" },
  { labelKey: "sourceInternalStandards", exampleKey: "sourceEngineeringDna" },
];

const DECOMP_CHIPS = [
  "decompRequirements",
  "decompProhibitions",
  "decompGuidance",
  "decompEngineeringInfo",
] as const;

type Destination = {
  titleKey: string;
  category: string;
  systems: string[];
  accent: {
    border: string;
    text: string;
    bg: string;
  };
};

const DESTINATIONS: Destination[] = [
  {
    titleKey: "destRequirementsManagement",
    category: "RMS",
    systems: ["PTC Codebeamer", "IBM DOORS", "Jama Connect", "Siemens Polarion"],
    accent: {
      border: "border-brand-violet/40",
      text: "text-brand-violet",
      bg: "bg-brand-violet/10",
    },
  },
  {
    titleKey: "destProductLifecycle",
    category: "PLM",
    systems: ["PTC Windchill", "Siemens Teamcenter"],
    accent: {
      border: "border-brand-blue/40",
      text: "text-brand-blue",
      bg: "bg-brand-blue/10",
    },
  },
  {
    titleKey: "destAssetLifecycle",
    category: "ALM / EAM",
    systems: ["IBM Maximo", "Bentley AssetWise", "AVEVA APM"],
    accent: {
      border: "border-brand-teal/40",
      text: "text-brand-teal",
      bg: "bg-brand-teal/10",
    },
  },
];

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0 0l-6-6m6 6l6-6" />
    </svg>
  );
}

export function DigitalThreadDiagram() {
  const t = useTranslations("diagrams");
  return (
    <section className="border-t border-card-border py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-teal mb-3">
            {t("dtEyebrow")}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-heading mb-4">
            {t.rich("dtTitle", {
              gradient: (chunks) => (
                <GradientText variant="teal-blue">{chunks}</GradientText>
              ),
            })}
          </h2>
          <p className="max-w-3xl mx-auto text-muted">
            {t("dtIntro")}
          </p>
        </div>

        {/* Layer 1 — Sources */}
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted text-center mb-3">
            {t("layer1Heading")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SOURCE_CHIPS.map((s) => (
              <div
                key={s.labelKey}
                className="rounded-xl border border-card-border bg-card-bg/60 px-4 py-3"
              >
                <p className="text-sm font-semibold text-foreground">{t(s.labelKey)}</p>
                {(s.example || s.exampleKey) && (
                  <p className="text-[11px] text-muted mt-1">
                    {s.exampleKey ? t(s.exampleKey) : s.example}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Down arrow to Layer 2 */}
        <div className="flex justify-center my-4" aria-hidden>
          <Arrow className="h-6 w-6 text-brand-teal/60" />
        </div>

        {/* Layer 2 — Decomposition engine (concept name only — no product brand) */}
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted text-center mb-3">
            {t("layer2Heading")}
          </p>
          <div className="rounded-2xl border-2 border-brand-teal/40 bg-gradient-to-br from-brand-teal/15 via-card-bg to-brand-blue/15 p-6 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold text-heading text-center mb-2">
              {t("engineTitle")}
            </h3>
            <p className="text-sm text-muted text-center max-w-2xl mx-auto mb-5">
              {t("layer2Body")}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {DECOMP_CHIPS.map((c) => (
                <span
                  key={c}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-teal/20 text-brand-teal border border-brand-teal/40"
                >
                  {t(c)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Down arrow to Layer 3 */}
        <div className="flex flex-col items-center my-4" aria-hidden>
          <Arrow className="h-6 w-6 text-brand-blue/60" />
        </div>

        {/* Layer 3 — Destination engineering systems */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted text-center mb-3">
            {t("layer3Heading")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DESTINATIONS.map((d) => (
              <div
                key={d.titleKey}
                className={`rounded-xl border ${d.accent.border} ${d.accent.bg} p-5`}
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-wider ${d.accent.text} mb-1`}
                >
                  {d.category}
                </p>
                <h4 className="text-base font-semibold text-heading mb-3">
                  {t(d.titleKey)}
                </h4>
                <ul className="space-y-1.5 text-sm text-muted">
                  {d.systems.map((s) => (
                    <li key={s} className="flex gap-2 items-start">
                      <span className={`${d.accent.text} mt-1`} aria-hidden>
                        ▸
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Change-cascade callout */}
        <div className="mt-10 rounded-xl border-s-4 border-brand-blue bg-brand-blue/10 p-5 sm:p-6">
          <p className="text-xs font-bold tracking-[0.2em] text-brand-blue mb-2">
            {t("changeCascadeLabel")}
          </p>
          <p className="text-sm text-foreground/85 leading-relaxed">
            {t("changeCascadeBody")}
          </p>
        </div>
      </div>
    </section>
  );
}
