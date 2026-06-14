"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { saveFootprint, updateMyRole } from "@/lib/regwatch/footprint-actions";
import { rematchMyFootprint } from "@/lib/regwatch/feed-actions";
import { RolePicker } from "./RolePicker";
import { GeographyPicker } from "./GeographyPicker";
import { ActivitiesPicker } from "./ActivitiesPicker";
import { SubstancesEditor } from "./SubstancesEditor";
import { RegulatorsPicker } from "./RegulatorsPicker";
import { TopicsPicker } from "./TopicsPicker";

interface RegulatorOption {
  slug: string;
  name: string;
  short_name: string | null;
  jurisdiction_code: string;
  region: string;
}

interface InitialFootprint {
  geographies: string[];
  activities_naics: string[];
  substances_cas: string[];
  monitored_regulator_slugs: string[];
  monitored_topics: string[];
}

interface Props {
  initialRole: string;
  initialFootprint: InitialFootprint;
  regulators: RegulatorOption[];
  /** Submit-button copy + post-save redirect target. */
  submitLabel: string;
  redirectTo: string;
  /** Show the role section. Onboarding shows it; settings page also shows it. */
  showRole?: boolean;
}

export function FootprintForm({
  initialRole,
  initialFootprint,
  regulators,
  submitLabel,
  redirectTo,
  showRole = true,
}: Props) {
  const t = useTranslations("regwatch.comply");
  const router = useRouter();
  const [role, setRole] = useState(initialRole);
  const [geographies, setGeographies] = useState(initialFootprint.geographies);
  const [naics, setNaics] = useState(initialFootprint.activities_naics);
  const [substances, setSubstances] = useState(initialFootprint.substances_cas);
  const [regs, setRegs] = useState(initialFootprint.monitored_regulator_slugs);
  const [topics, setTopics] = useState(initialFootprint.monitored_topics);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      if (showRole && role) {
        const r = await updateMyRole({ functional_role: role });
        if (!r.ok) {
          setMessage({ kind: "error", text: t("roleUpdateFailed", { error: r.error ?? "" }) });
          return;
        }
      }
      const res = await saveFootprint({
        geographies,
        activities_naics: naics,
        substances_cas: substances,
        monitored_regulator_slugs: regs,
        monitored_topics: topics,
      });
      if (!res.ok) {
        setMessage({ kind: "error", text: res.error ?? t("errCouldNotSave") });
        return;
      }
      setMessage({ kind: "ok", text: t("savedRescoring") });
      // Fire-and-forget — the user shouldn't wait for the matcher to finish
      // before being redirected. The Feed page revalidates server-side once
      // the action completes, so a subsequent navigation shows fresh matches.
      rematchMyFootprint().catch(() => {
        /* non-fatal — the next match cron will pick it up */
      });
      router.push(redirectTo);
      router.refresh();
    });
  }

  const totalSelections =
    geographies.length + naics.length + substances.length + regs.length + topics.length;

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      {showRole && (
        <Section
          step={1}
          title={t("fpRoleTitle")}
          description={t("fpRoleDescription")}
        >
          <RolePicker value={role} onChange={setRole} />
        </Section>
      )}

      <div data-tour="footprint-geographies">
        <Section
          step={showRole ? 2 : 1}
          title={t("fpGeographyTitle")}
          description={t("fpGeographyDescription")}
        >
          <GeographyPicker value={geographies} onChange={setGeographies} />
        </Section>
      </div>

      <div data-tour="footprint-naics">
        <Section
          step={showRole ? 3 : 2}
          title={t("fpActivitiesTitle")}
          description={t("fpActivitiesDescription")}
        >
          <ActivitiesPicker value={naics} onChange={setNaics} />
        </Section>
      </div>

      <Section
        step={showRole ? 4 : 3}
        title={t("fpSubstancesTitle")}
        description={t("fpSubstancesDescription")}
      >
        <SubstancesEditor value={substances} onChange={setSubstances} />
      </Section>

      <Section
        step={showRole ? 5 : 4}
        title={t("fpRegulatorsTitle")}
        description={t("fpRegulatorsDescription")}
      >
        <RegulatorsPicker value={regs} options={regulators} onChange={setRegs} />
      </Section>

      <div data-tour="footprint-topics">
        <Section
          step={showRole ? 6 : 5}
          title={t("fpTopicsTitle")}
          description={t("fpTopicsDescription")}
        >
          <TopicsPicker value={topics} onChange={setTopics} />
        </Section>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-card-border bg-background/95 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted">
          {totalSelections > 0
            ? t("configurationChoices", { count: totalSelections })
            : t("nothingConfigured")}
          {message && (
            <span
              className={`ms-3 ${message.kind === "ok" ? "text-brand-teal" : "text-red-400"}`}
            >
              {message.text}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          data-tour="footprint-save"
          className="rounded-md bg-brand-blue px-5 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("saving") : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Section({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-teal/15 text-xs font-semibold text-brand-teal">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
