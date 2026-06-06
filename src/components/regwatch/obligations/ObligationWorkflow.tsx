"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
        setError(res.error ?? "Action failed");
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
        setError(res.error ?? "Could not submit for approval");
        return;
      }
      setDialog(null);
      reset();
      router.refresh();
    });
  }
  function handleKickback() {
    if (!notes.trim()) {
      setError("Provide kick-back notes for the reviewer");
      return;
    }
    fire({ id: obligationId, toStatus: "in-review", notes: notes.trim() });
  }
  function handleSignOff() {
    if (!rationale.trim()) {
      setError("Sign-off rationale is required");
      return;
    }
    if (
      unacknowledgedHighSeverityFindings.length > 0 &&
      !signoffAcknowledged
    ) {
      setError(
        "Tick the acknowledgement box to confirm you've reviewed the AI-flagged discrepancies",
      );
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
      setError("Provide a rationale");
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
        setError(res.error ?? "Could not update");
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
        setError(res.error ?? "Could not assign");
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
    actions.push({ label: "Start review", onClick: handleClaim });
    actions.push({
      label: "Not applicable",
      onClick: () => {
        reset();
        setDialog({ kind: "not-applicable" });
      },
    });
  }
  if (reviewStatus === "in-review" && (isReviewer || isAdmin)) {
    actions.push({
      label: "Submit for approval",
      onClick: () => {
        reset();
        setDialog({ kind: "complete-review" });
      },
    });
    actions.push({
      label: "Not applicable",
      onClick: () => {
        reset();
        setDialog({ kind: "not-applicable" });
      },
    });
  }
  if (reviewStatus === "pending-approval" && isAdmin) {
    actions.push({
      label: "Sign off & verify",
      onClick: () => {
        reset();
        setDialog({ kind: "sign-off" });
      },
    });
    actions.push({
      label: "Kick back to reviewer",
      onClick: () => {
        reset();
        setDialog({ kind: "kickback" });
      },
      danger: true,
    });
  }
  if (reviewStatus === "verified" && isAdmin) {
    actions.push({ label: "Close", onClick: handleClose });
  }
  if (
    isAdmin &&
    ["pending-approval", "verified", "closed", "not-applicable"].includes(
      reviewStatus,
    )
  ) {
    actions.push({
      label: "Re-open",
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
      label: "Save and come back later",
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
            Admin grading
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                Severity
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
                Compliance status
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
                Re-review cadence
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
                  placeholder="Days"
                />
              )}
            </label>
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                Assign reviewer
              </span>
              <select
                value={assignedReviewerUserId ?? ""}
                disabled={pending}
                onChange={(e) => handleAssign(e.target.value)}
                className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground focus:border-brand-blue focus:outline-none"
              >
                <option value="">(unassigned)</option>
                {assignees.map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.displayName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-[10px] text-muted">
            These fields are locked to owners and admins. The reviewer sees
            them but cannot edit.
          </p>
        </section>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {dialog && (
        <Dialog onClose={() => setDialog(null)} title={titleFor(dialog)}>
          {dialog.kind === "complete-review" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                The obligation moves to <strong>pending-approval</strong>; an
                admin signs off to verify. Evidence files are managed in the
                <em> Evidence</em> section above &mdash; make sure at least
                one file is uploaded before submitting.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Review notes (optional)"
                className="w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
              />
              <DialogActions
                pending={pending}
                onCancel={() => setDialog(null)}
                onConfirm={handleCompleteReview}
                confirmLabel="Submit for approval"
              />
            </div>
          )}
          {dialog.kind === "kickback" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Send back to the reviewer with notes on what needs to be
                revised. State returns to <strong>in-review</strong>.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="What needs to be redone?"
                className="w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
              />
              <DialogActions
                pending={pending}
                onCancel={() => setDialog(null)}
                onConfirm={handleKickback}
                confirmLabel="Kick back"
                danger
              />
            </div>
          )}
          {dialog.kind === "sign-off" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Sign-off is recorded with your identity, timestamp, and rationale.
                The rationale is stored on the obligation and in the audit
                history.
              </p>
              {unacknowledgedHighSeverityFindings.length > 0 && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                  <p className="text-[11px] font-medium text-amber-200">
                    {unacknowledgedHighSeverityFindings.length} AI-flagged{" "}
                    {unacknowledgedHighSeverityFindings.length === 1
                      ? "discrepancy"
                      : "discrepancies"}{" "}
                    not yet acknowledged
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-amber-100/90">
                    {unacknowledgedHighSeverityFindings.map((f) => (
                      <li key={`${f.evidenceFileId}-${f.findingId}`}>
                        <span
                          className={`mr-1.5 rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                            f.severity === "critical"
                              ? "bg-red-600/40 text-red-100"
                              : "bg-amber-500/30 text-amber-100"
                          }`}
                        >
                          {f.severity}
                        </span>
                        <span className="font-medium">{f.title}</span>
                        <span className="ml-1 text-amber-200/70">
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
                      I have reviewed these AI-flagged discrepancies and am
                      proceeding with sign-off despite them being
                      unacknowledged.
                    </span>
                  </label>
                </div>
              )}
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={5}
                placeholder="Sign-off rationale (required) — what was reviewed, why this status, any caveats."
                className="w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
              />
              <DialogActions
                pending={pending}
                onCancel={() => setDialog(null)}
                onConfirm={handleSignOff}
                confirmLabel="Sign off & verify"
              />
            </div>
          )}
          {dialog.kind === "not-applicable" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Mark as Not Applicable with a rationale. The obligation is
                terminal (no further review).
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Why is this not applicable to the asset?"
                className="w-full rounded-md border border-card-border bg-card-bg px-2 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
              />
              <DialogActions
                pending={pending}
                onCancel={() => setDialog(null)}
                onConfirm={handleNotApplicable}
                confirmLabel="Mark N/A"
              />
            </div>
          )}
          {dialog.kind === "reopen" && (
            <div className="space-y-3">
              <p className="text-xs text-amber-300">
                Re-opening clears the workflow state back to <strong>open</strong>.
                The audit history will record this with your identity.
              </p>
              <DialogActions
                pending={pending}
                onCancel={() => setDialog(null)}
                onConfirm={handleReopen}
                confirmLabel="Re-open"
                danger
              />
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}

function titleFor(d: NonNullable<DialogKind>): string {
  switch (d.kind) {
    case "complete-review":
      return "Submit review for approval";
    case "kickback":
      return "Kick back to reviewer";
    case "sign-off":
      return "Admin sign-off";
    case "not-applicable":
      return "Mark as not applicable";
    case "reopen":
      return "Re-open obligation";
  }
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
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
            aria-label="Close"
            title="Close this dialog without submitting"
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
  pending,
  danger,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
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
        Cancel
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
        {pending ? "Working…" : confirmLabel}
      </button>
    </div>
  );
}
