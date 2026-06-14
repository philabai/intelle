"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createObligation } from "@/lib/regwatch/obligations-actions";
import { RegulationPicker } from "@/components/regwatch/RegulationPicker";
import { AssetPicker } from "@/components/regwatch/AssetPicker";
import type { RegulationPickerResult } from "@/lib/regwatch/regulation-picker-actions";

interface AssigneeOption {
  userId: string;
  displayName: string;
}

interface AssetPickerNode {
  id: string;
  parentId: string | null;
  level: 2 | 3 | 4 | 5 | 6;
  name: string;
  code: string | null;
}

interface Props {
  assets: AssetPickerNode[];
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  assignees: AssigneeOption[];
}

const SEVERITY_OPTIONS = [
  { value: "negligible", label: "Negligible" },
  { value: "marginal", label: "Marginal" },
  { value: "moderate", label: "Moderate" },
  { value: "critical", label: "Critical" },
  { value: "catastrophic", label: "Catastrophic" },
];

const STATUS_OPTIONS = [
  { value: "unknown", label: "Unknown" },
  { value: "non-compliant", label: "Non-compliant" },
  { value: "at-risk", label: "At risk" },
  { value: "compliant", label: "Compliant" },
];

const CADENCE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi-annually", label: "Semi-annually" },
  { value: "annually", label: "Annually" },
  { value: "custom", label: "Custom (days)" },
];

export function CreateObligationForm({
  assets,
  levelLabels,
  assignees,
}: Props) {
  const t = useTranslations("regwatch.comply");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [assetId, setAssetId] = useState<string | null>(null);
  const [regulation, setRegulation] = useState<RegulationPickerResult | null>(null);
  const [clauseAnchor, setClauseAnchor] = useState("");
  const [clauseText, setClauseText] = useState("");
  const [severity, setSeverity] = useState("moderate");
  const [complianceStatus, setComplianceStatus] = useState("unknown");
  const [reviewCadence, setReviewCadence] = useState("none");
  const [reviewCadenceCustomDays, setReviewCadenceCustomDays] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!assetId) {
      setError(t("errPickAsset"));
      return;
    }
    if (!regulation) {
      setError(t("errPickRegulation"));
      return;
    }
    startTransition(async () => {
      const res = await createObligation({
        assetId,
        regulatoryItemId: regulation.id,
        clauseAnchor: clauseAnchor.trim() || null,
        clauseText: clauseText.trim() || null,
        severity,
        complianceStatus,
        reviewCadence,
        reviewCadenceCustomDays:
          reviewCadence === "custom" && reviewCadenceCustomDays
            ? Number(reviewCadenceCustomDays)
            : null,
        assignedReviewerUserId: assigneeUserId || null,
      });
      if (!res.ok || !res.id) {
        setError(res.error ?? t("errCouldNotCreate"));
        return;
      }
      router.push(`/regwatch/obligations/${res.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted">
          {t("asset")}
        </label>
        <div className="mt-1">
          <AssetPicker
            flat={assets}
            levelLabels={levelLabels}
            value={assetId}
            onChange={setAssetId}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted">
          {t("regulation")}
        </label>
        <div className="mt-1">
          <RegulationPicker
            value={regulation}
            onChange={setRegulation}
            clauseAnchor={clauseAnchor}
            onClauseAnchorChange={setClauseAnchor}
            clauseText={clauseText}
            onClauseTextChange={setClauseText}
            showClauseField
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            {t("severity")}
          </span>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground focus:border-brand-blue focus:outline-none"
          >
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            {t("complianceStatus")}
          </span>
          <select
            value={complianceStatus}
            onChange={(e) => setComplianceStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground focus:border-brand-blue focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            {t("reReviewCadence")}
          </span>
          <select
            value={reviewCadence}
            onChange={(e) => setReviewCadence(e.target.value)}
            className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground focus:border-brand-blue focus:outline-none"
          >
            {CADENCE_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {reviewCadence === "custom" && (
            <input
              type="number"
              min={1}
              max={3650}
              value={reviewCadenceCustomDays}
              onChange={(e) => setReviewCadenceCustomDays(e.target.value)}
              placeholder={t("days")}
              className="mt-2 w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
            />
          )}
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">
            {t("assignReviewer")}
          </span>
          <select
            value={assigneeUserId}
            onChange={(e) => setAssigneeUserId(e.target.value)}
            className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground focus:border-brand-blue focus:outline-none"
          >
            <option value="">{t("optionNoReviewer")}</option>
            {assignees.map((a) => (
              <option key={a.userId} value={a.userId}>
                {a.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending || !assetId || !regulation}
          className="ms-auto rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? t("creating") : t("createObligationButton")}
        </button>
      </div>
    </form>
  );
}
