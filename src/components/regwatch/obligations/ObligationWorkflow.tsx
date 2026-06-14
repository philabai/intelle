"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  transitionObligationState,
  updateObligationGrade,
  assignObligation,
} from "@/lib/regwatch/obligations-actions";
import type {
  ObligationReviewStatus,
  ObligationSeverity,
  ObligationComplianceStatus,
  ObligationReviewCadence,
} from "@/lib/regwatch/obligations";

interface AssigneeOption {
  userId: string;
  displayName: string;
}

interface UnacknowledgedFindingDigest {
  evidenceFileId: string;
  fileName: string;
  findingId: string;
  title: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
}

interface Props {
  obligationId: string;
  reviewStatus: ObligationReviewStatus;
  severity: ObligationSeverity;
  complianceStatus: ObligationComplianceStatus;
  reviewCadence: ObligationReviewCadence;
  reviewCadenceCustomDays: number | null;
  assignedReviewerUserId: string | null;
  evidenceFilePath: string | null;
  currentUserId: string;
  isAdmin: boolean;
  assignees: AssigneeOption[];
  /** Per-file unacknowledged HIGH or CRITICAL findings — surfaced in the
   *  sign-off dialog so the admin must acknowledge them before verifying. */
  unacknowledgedHighSeverityFindings: UnacknowledgedFindingDigest[];
}

type DialogKind =
  | null
  | { kind: "complete-review" }
  | { kind: "kickback" }
  | { kind: "sign-off" }
  | { kind: "not-applicable" }
  | { kind: "reopen" };

const SEVERITY_OPTIONS = [
  "negligible",
  "marginal",
  "moderate",
  "critical",
  "catastrophic",
] as const;
const STATUS_OPTIONS = [
  "unknown",
  "non-compliant",
  "at-risk",
  "compliant",
] as const;
const CADENCE_OPTIONS = [
  "none",
  "quarterly",
  "semi-annually",
  "annually",
  "custom",
] as const;

export function ObligationWorkflow({
  obligationId,
  reviewStatus,
  severity,
  complianceStatus,
  reviewCadence,
  reviewCadenceCustomDays,
  assignedReviewerUserId,
  evidenceFilePath,
  currentUserId,
  isAdmin,
  assignees,
  unacknowledgedHighSeverityFindings,
}: Props) {
  const t = useTranslations("regwatch.comply");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);

  // form state shared across dialogs
  const [notes, setNotes] = useState("");
  const [rationale, setRationale] = useState("");
  const [signoffAcknowledged, setSignoffAcknowledged] = useState(false);

  const isReviewer = assignedReviewerUserId === currentUserId;

  function reset() {
    setNotes("");
    setRationale("");
    setSignoffAcknowledged(false);
    setError(null);
  }

  function fire(payload: Parameters<typeof transitionObligationState>[0]) {
    setError(null);
    startTransition(async () => {
      const res = await transitionObligationState(payload);
      if (!res.ok) {
        setError(res.error ?? t("errActionFailed"));
        return;
      }
      setDialog(null);
      reset();
      router.refresh();
    });
  }

  function handleClaim() {
    fire({ id: obligationId, toStatus: "in-review" });
  }
  function handleClose() {
    fire({ id: obligationId, toStatus: "closed" });
  }
  function handleCompleteReview() {
    setError(null);
    // Evidence files are now uploaded via the multi-file dropzone in the
    // "Evidence" section above the workflow. The dialog just collects the
    // optional notes and submits the transition; the server-side
    // precondition checks that at least one evidence row exists.
    startTransition(async () => {
      const res = await transitionObligationState({
        id: obligationId,
        toStatus: "pending-approval",
        notes: notes.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? t("errCouldNotSubmit"));
        return;
      }
      setDialog(null);
      reset();
      router.refresh();
    });
  }
  function handleKickback() {
    if (!notes.trim()) {
      setError(t("errKickbackNotes"));
      return;
    }
    fire({ id: obligationId, toStatus: "in-review", notes: notes.trim() });
  }
  function handleSignOff() {
    if (!rationale.trim()) {
      setError(t("errSignoffRationaleRequired"));
      return;
    }
    if (
      unacknowledgedHighSeverityFindings.length > 0 &&
      !signoffAcknowledged
    ) {
      setError(t("errSignoffAcknowledge"));
      return;
    }
    fire({
      id: obligationId,
      toStatus: "verified",
      signoffRationale: rationale.trim(),
    });
  }
  function handleNotApplicable() {
    if (!notes.trim()) {
      setError(t("errProvideRationale"));
      return;
    }
    fire({
      id: obligationId,
      toStatus: "not-applicable",
      notes: notes.trim(),
    });
  }
  function handleReopen() {
    fire({ id: obligationId, toStatus: "open" });
  }

  function handleGradeUpdate(
    next: Partial<{
      severity: ObligationSeverity;
      complianceStatus: ObligationComplianceStatus;
      reviewCadence: ObligationReviewCadence;
      reviewCadenceCustomDays: number | null;
    }>,
  ) {
    setError(null);
    startTransition(async () => {
      const res = await updateObligationGrade({
        id: obligationId,
        ...next,
      });
      if (!res.ok) {
        setError(res.error ?? t("errCouldNotUpdate"));
        return;
      }
      router.refresh();
    });
  }

  function handleAssign(userId: string) {
    setError(null);
    startTransition(async () => {
      const res = await assignObligation({
        id: obligationId,
        assigneeUserId: userId || null,
      });
      if (!res.ok) {
        setError(res.error ?? t("errCouldNotAssign"));
        return;
      }
      router.refresh();
    });
  }

  // ---- Render --------------------------------------------------------------
  const actions: {
    label: string;
    onClick: () => void;
    danger?: boolean;
    secondary?: boolean;
  }[] = [];

  if (reviewStatus === "awaiting-triage" && (isReviewer || isAdmin)) {
    actions.push({ label: t("actStartReview"), onClick: handleClaim });
    actions.push({
      label: t("actNotApplicable"),
      onClick: () => {
        reset();
        setDialog({ kind: "not-applicable" });
      },
    });
  }
  if (reviewStatus === "in-review" && (isReviewer || isAdmin)) {
    actions.push({
      label: t("actSubmitForApproval"),
      onClick: () => {
        reset();
        setDialog({ kind: "complete-review" });
      },
    });
    actions.push({
      label: t("actNotApplicable"),
      onClick: () => {
        reset();
        setDialog({ kind: "not-applicable" });
      },
    });
  }
  if (reviewStatus === "pending-approval" && isAdmin) {
    actions.push({
      label: t("actSignOffVerify"),
      onClick: () => {
        reset();
        setDialog({ kind: "sign-off" });
      },
    });
    actions.push({
      label: t("actKickBack"),
      onClick: () => {
        reset();
        setDialog({ kind: "kickback" });
      },
      danger: true,
    });
  }
  if (reviewStatus === "verified" && isAdmin) {
    actions.push({ label: t("actClose"), onClick: handleClose });
  }
  if (
    isAdmin &&
    ["pending-approval", "verified", "closed", "not-applicable"].includes(
      reviewStatus,
    )
  ) {
    actions.push({
      label: t("actReopen"),
      onClick: () => {
        reset();
        setDialog({ kind: "reopen" });
      },
      danger: true,
    });
  }

  // "Save and come back later" — surfaces whenever the reviewer or admin is
  // mid-flight on a non-terminal obligation. Evidence + acknowledgements +
  // notes auto-save as the reviewer works, so the button is purely
  // navigational: it returns to the obligations list with a clean slate so
  // the user can come back when the AI analysis has finished or when they
  // have time to keep going.
  if (
    (isReviewer || isAdmin) &&
    !["closed", "not-applicable"].includes(reviewStatus)
  ) {
    actions.push({
      label: t("actSaveComeBack"),
      onClick: () => router.push("/regwatch/obligations"),
      secondary: true,
    });
  }

  return (
    <div className="space-y-4">
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              disabled={pending}
              className={`rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                a.danger
                  ? "border border-red-500/40 bg-transparent text-red-300 hover:border-red-500 hover:bg-red-500/10"
                  : a.secondary
                    ? "border border-card-border bg-card-bg text-muted hover:border-brand-blue hover:text-foreground"
                    : "bg-brand-blue text-white hover:bg-brand-blue/90"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Admin grading panel */}
      {isAdmin && (
        <section className="rounded-xl border border-card-border bg-card-bg/40 p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
            {t("adminGrading")}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                {t("severity")}
              </span>
              <select
                value={severity}
                disabled={pending}
                onChange={(e) =>
                  handleGradeUpdate({
                    severity: e.target.value as ObligationSeverity,
                  })
                }
                className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground focus:border-brand-blue focus:outline-none"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                {t("complianceStatus")}
              </span>
              <select
                value={complianceStatus}
                disabled={pending}
                onChange={(e) =>
                  handleGradeUpdate({
                    complianceStatus: e.target.value as ObligationComplianceStatus,
                  })
                }
                className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground focus:border-brand-blue focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                {t("reReviewCadence")}
              </span>
              <select
                value={reviewCadence}
                disabled={pending}
                onChange={(e) =>
                  handleGradeUpdate({
                    reviewCadence: e.target.value as ObligationReviewCadence,
                  })
                }
                className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground focus:border-brand-blue focus:outline-none"
              >
                {CADENCE_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {reviewCadence === "custom" && (
                <input
                  type="number"
                  min={1}
                  max={3650}
                  defaultValue={reviewCadenceCustomDays ?? 0}
                  disabled={pending}
                  onBlur={(e) =>
                    handleGradeUpdate({
                      reviewCadence: "custom",
                      reviewCadenceCustomDays: Number(e.target.value) || null,
                    })
                  }
                  className="mt-2 w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                  placeholder={t("days")}
                />
              )}
            </label>
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                {t("assignReviewer")}
              </span>
              <select
                value={assignedReviewerUserId ?? ""}
                disabled={pending}
                onChange={(e) => handleAssign(e.target.value)}
                className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground focus:border-brand-blue focus:outline-none"
              >
                <option value="">{t("optionUnassigned")}</option>
                {assignees.map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.displayName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-[10px] text-muted">
            {t("adminGradingHint")}
          </p>
        </section>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {dialog && (
        <Dialog onClose={() => setDialog(null)} title={titleFor(dialog, t)} closeLabel={t("dialogClose")} closeTitle={t("dialogCloseTitle")}>
          {dialog.kind === "complete-review" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                {t.rich("dialogCompleteReviewBody", {
                  strong: (c) => <strong>{c}</strong>,
                  em: (c) => <em>{c}</em>,
                })}
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder={t("reviewNotesPlaceholder")}
                className="w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
              />
              <DialogActions
                pending={pending}
                onCancel={() => setDialog(null)}
                onConfirm={handleCompleteReview}
                confirmLabel={t("actSubmitForApproval")}
                cancelLabel={t("cancel")}
                workingLabel={t("working")}
              />
            </div>
          )}
          {dialog.kind === "kickback" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                {t.rich("dialogKickbackBody", {
                  strong: (c) => <strong>{c}</strong>,
                })}
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder={t("kickbackPlaceholder")}
                className="w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
              />
              <DialogActions
                pending={pending}
                onCancel={() => setDialog(null)}
                onConfirm={handleKickback}
                confirmLabel={t("actKickBackShort")}
                cancelLabel={t("cancel")}
                workingLabel={t("working")}
                danger
              />
            </div>
          )}
          {dialog.kind === "sign-off" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                {t("dialogSignOffBody")}
              </p>
              {unacknowledgedHighSeverityFindings.length > 0 && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                  <p className="text-[11px] font-medium text-amber-200">
                    {t("unacknowledgedFindings", {
                      count: unacknowledgedHighSeverityFindings.length,
                    })}
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-amber-100/90">
                    {unacknowledgedHighSeverityFindings.map((f) => (
                      <li key={`${f.evidenceFileId}-${f.findingId}`}>
                        <span
                          className={`me-1.5 rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                            f.severity === "critical"
                              ? "bg-red-600/40 text-red-100"
                              : "bg-amber-500/30 text-amber-100"
                          }`}
                        >
                          {f.severity}
                        </span>
                        <span className="font-medium">{f.title}</span>
                        <span className="ms-1 text-amber-200/70">
                          ({f.fileName})
                        </span>
                      </li>
                    ))}
                  </ul>
                  <label className="mt-3 flex items-start gap-2 text-[11px] text-amber-100">
                    <input
                      type="checkbox"
                      checked={signoffAcknowledged}
                      onChange={(e) =>
                        setSignoffAcknowledged(e.target.checked)
                      }
                      className="mt-0.5 h-3 w-3"
                    />
                    <span>
                      {t("signoffAcknowledgeCheckbox")}
                    </span>
                  </label>
                </div>
              )}
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={5}
                placeholder={t("signoffRationalePlaceholder")}
                className="w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
              />
              <DialogActions
                pending={pending}
                onCancel={() => setDialog(null)}
                onConfirm={handleSignOff}
                confirmLabel={t("actSignOffVerify")}
                cancelLabel={t("cancel")}
                workingLabel={t("working")}
              />
            </div>
          )}
          {dialog.kind === "not-applicable" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                {t("dialogNotApplicableBody")}
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder={t("notApplicablePlaceholder")}
                className="w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
              />
              <DialogActions
                pending={pending}
                onCancel={() => setDialog(null)}
                onConfirm={handleNotApplicable}
                confirmLabel={t("actMarkNA")}
                cancelLabel={t("cancel")}
                workingLabel={t("working")}
              />
            </div>
          )}
          {dialog.kind === "reopen" && (
            <div className="space-y-3">
              <p className="text-xs text-amber-300">
                {t.rich("dialogReopenBody", {
                  strong: (c) => <strong>{c}</strong>,
                })}
              </p>
              <DialogActions
                pending={pending}
                onCancel={() => setDialog(null)}
                onConfirm={handleReopen}
                confirmLabel={t("actReopenShort")}
                cancelLabel={t("cancel")}
                workingLabel={t("working")}
                danger
              />
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}

function titleFor(
  d: NonNullable<DialogKind>,
  t: ReturnType<typeof useTranslations>,
): string {
  switch (d.kind) {
    case "complete-review":
      return t("dialogTitleCompleteReview");
    case "kickback":
      return t("dialogTitleKickback");
    case "sign-off":
      return t("dialogTitleSignOff");
    case "not-applicable":
      return t("dialogTitleNotApplicable");
    case "reopen":
      return t("dialogTitleReopen");
  }
}

function Dialog({
  title,
  onClose,
  closeLabel,
  closeTitle,
  children,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
  closeTitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-card-border bg-background p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground"
            aria-label={closeLabel}
            title={closeTitle}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogActions({
  onCancel,
  onConfirm,
  confirmLabel,
  cancelLabel,
  workingLabel,
  pending,
  danger,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  cancelLabel: string;
  workingLabel: string;
  pending: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground hover:border-brand-blue disabled:opacity-50"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className={`rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
          danger
            ? "border border-red-500/40 bg-transparent text-red-300 hover:bg-red-500/10"
            : "bg-brand-blue text-white hover:bg-brand-blue/90"
        }`}
      >
        {pending ? workingLabel : confirmLabel}
      </button>
    </div>
  );
}
