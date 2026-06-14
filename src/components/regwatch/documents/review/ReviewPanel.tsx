"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  TRANSITIONS,
  canTransition,
  type ReviewAction,
} from "@/lib/regwatch/internal-document-state-machine";
import {
  transitionDocument,
  unassignReviewerOrApprover,
} from "@/lib/regwatch/internal-document-workflow-actions";
import type { InternalDocumentReviewState } from "@/lib/regwatch/internal-documents";
import type {
  ReviewAssignment,
  SignatureRow,
  AuditEvent,
} from "@/lib/regwatch/internal-document-review";
import type { StaleCitation } from "@/lib/regwatch/internal-document-citations";
import { StatePill } from "./StatePill";
import { ReasonForChangeDialog } from "./ReasonForChangeDialog";
import { AssignReviewerDialog } from "./AssignReviewerDialog";
import { CitationReviewQueue } from "./CitationReviewQueue";

interface OrgMemberOption {
  userId: string;
  displayName: string;
  email: string | null;
  role: string;
}

interface Props {
  docId: string;
  reviewState: InternalDocumentReviewState;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  currentUserId: string;
  currentUserRoleOnDoc: "owner" | "reviewer" | "approver" | "admin" | null;
  isOrgAdmin: boolean;
  assignments: ReviewAssignment[];
  signatures: SignatureRow[];
  auditEvents: AuditEvent[];
  orgMembers: OrgMemberOption[];
  staleCitations: StaleCitation[];
}

const EVENT_LABEL_KEY: Record<string, string> = {
  created: "eventCreated",
  updated_metadata: "eventMetadataUpdated",
  revision_saved: "eventRevisionSaved",
  revision_committed: "eventRevisionCommitted",
  uploaded_file: "eventFileUploaded",
  submitted_for_review: "eventSubmittedForReview",
  reviewer_assigned: "eventReviewerAssigned",
  approver_assigned: "eventApproverAssigned",
  reviewer_completed: "eventReviewApproved",
  changes_requested: "eventChangesRequested",
  approved: "eventApprovalSigned",
  marked_effective: "eventMarkedEffective",
  superseded: "eventSuperseded",
  retired: "eventRetired",
  comment_added: "eventCommentAdded",
  comment_resolved: "eventCommentResolved",
  citation_inserted: "eventCitationInserted",
  citation_flagged_stale: "eventCitationFlaggedStale",
};

const SIG_MEANING_KEY: Record<SignatureRow["meaning"], string> = {
  authored: "sigAuthored",
  reviewed: "sigReviewed",
  approved: "sigApproved",
};

export function ReviewPanel({
  docId,
  reviewState,
  ownerUserId,
  ownerDisplayName,
  currentUserRoleOnDoc,
  isOrgAdmin,
  assignments,
  signatures,
  auditEvents,
  orgMembers,
  staleCitations,
}: Props) {
  const t = useTranslations("regwatch.documents");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState<{
    action: ReviewAction;
  } | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const openAssignments = assignments.filter((a) => !a.completedAt);

  function startTransitionFlow(action: ReviewAction) {
    setError(null);
    setDialogOpen({ action });
  }

  function submitTransition(reason: string) {
    if (!dialogOpen) return;
    startTransition(async () => {
      const res = await transitionDocument({
        docId,
        action: dialogOpen.action,
        reasonForChange: reason,
      });
      if (!res.ok) {
        setError(res.error ?? t("couldNotPerformAction"));
        return;
      }
      setDialogOpen(null);
      router.refresh();
    });
  }

  function onUnassign(assignmentId: string) {
    startTransition(async () => {
      const res = await unassignReviewerOrApprover({ assignmentId });
      if (!res.ok) {
        setError(res.error ?? t("couldNotUnassign"));
        return;
      }
      router.refresh();
    });
  }

  const availableActions = (
    [
      "submitForReview",
      "withdrawReview",
      "recordReviewApprove",
      "recordReviewRequestChanges",
      "recordApproval",
      "markEffective",
      "supersede",
    ] as ReviewAction[]
  ).filter((a) => canTransition(a, reviewState, currentUserRoleOnDoc));

  const activeRule = dialogOpen ? TRANSITIONS[dialogOpen.action] : null;

  return (
    <div className="rounded-xl border border-card-border bg-card-bg/40 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {t("reviewWorkflow")}
          </h2>
          <StatePill state={reviewState} />
        </div>
        <div className="flex items-center gap-2">
          {isOrgAdmin && (
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="rounded-md border border-card-border bg-background px-2.5 py-1 text-[11px] text-foreground/90 hover:border-brand-blue hover:text-foreground"
            >
              {t("assignReviewerShort")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAudit((v) => !v)}
            className="rounded-md border border-card-border bg-background px-2.5 py-1 text-[11px] text-muted hover:border-brand-blue hover:text-foreground"
          >
            {showAudit ? t("hideAuditTrail") : t("auditTrail")}
          </button>
          <a
            href={`/api/regwatch/documents/${docId}/audit-trail`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-card-border bg-background px-2.5 py-1 text-[11px] text-muted hover:border-brand-blue hover:text-foreground"
            title={t("exportAuditPdfTitle")}
          >
            {t("exportPdf")}
          </a>
        </div>
      </div>

      {/* Action buttons */}
      {availableActions.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {availableActions.map((action) => {
            const rule = TRANSITIONS[action];
            const isPrimary = action === "submitForReview" || action === "markEffective" || action === "recordReviewApprove";
            return (
              <button
                key={action}
                type="button"
                onClick={() => startTransitionFlow(action)}
                disabled={pending}
                className={`rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                  isPrimary
                    ? "bg-brand-blue text-white hover:bg-brand-blue/90"
                    : "border border-card-border bg-background text-foreground/90 hover:border-brand-blue"
                }`}
              >
                {rule.label}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mb-4 rounded-md border border-card-border bg-card-bg/30 p-2 text-[11px] text-muted">
          {t.rich("noActionsAvailable", {
            state: reviewState,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
          {error}
        </p>
      )}

      {/* Citation review queue — stale-citation auditor surface */}
      <div className="mb-3">
        <CitationReviewQueue stale={staleCitations} />
      </div>

      {/* Assignments + Owner */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-card-border bg-background/40 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">
            {t("owner")}
          </p>
          {ownerUserId ? (
            <p className="text-xs text-foreground">
              {ownerDisplayName ?? ownerUserId}
            </p>
          ) : (
            <p className="text-[11px] text-muted">{t("noOwnerAssigned")}</p>
          )}
        </div>
        <div className="rounded-md border border-card-border bg-background/40 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">
            {t("openAssignments")}
          </p>
          {openAssignments.length === 0 ? (
            <p className="text-[11px] text-muted">{t("noneYet")}</p>
          ) : (
            <ul className="space-y-1.5">
              {openAssignments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs text-foreground">
                      {a.userDisplayName}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-brand-teal">
                      {a.role}
                    </p>
                  </div>
                  {isOrgAdmin && (
                    <button
                      type="button"
                      onClick={() => onUnassign(a.id)}
                      disabled={pending}
                      className="text-[10px] text-muted hover:text-red-300 disabled:opacity-50"
                    >
                      {t("removeLower")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Signature manifest */}
      <div className="mt-3 rounded-md border border-card-border bg-background/40 p-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">
          {t("signatureManifest")}
        </p>
        {signatures.length === 0 ? (
          <p className="text-[11px] text-muted">
            {t("noSignaturesYet")}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {signatures.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-card-border pb-1.5 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-xs text-foreground">
                    {t.rich("signatureBy", {
                      meaning: t(SIG_MEANING_KEY[s.meaning]),
                      signer: s.signerDisplayName,
                      strong: (chunks) => (
                        <span className="font-medium">{chunks}</span>
                      ),
                    })}
                  </p>
                  {s.signerEmail && (
                    <p className="text-[10px] text-muted">
                      {s.signerEmail}
                      {s.ipAddress && ` · ${s.ipAddress}`}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 text-[10px] text-muted"
                  title={format.dateTime(new Date(s.signedAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                >
                  {format.relativeTime(new Date(s.signedAt))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Audit trail */}
      {showAudit && (
        <div className="mt-3 rounded-md border border-card-border bg-background/40 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">
            {t("auditTrailWithCount", { count: auditEvents.length })}
          </p>
          {auditEvents.length === 0 ? (
            <p className="text-[11px] text-muted">{t("noEventsYet")}</p>
          ) : (
            <ol className="space-y-1.5">
              {auditEvents.map((e) => {
                const reason =
                  (e.payload?.reasonForChange as string | undefined) ?? null;
                return (
                  <li
                    key={e.id}
                    className="border-b border-card-border pb-1.5 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-xs text-foreground">
                        {t.rich("auditEventBy", {
                          event: EVENT_LABEL_KEY[e.eventType]
                            ? t(EVENT_LABEL_KEY[e.eventType])
                            : e.eventType,
                          actor: e.actorDisplayName,
                          strong: (chunks) => (
                            <span className="font-medium">{chunks}</span>
                          ),
                        })}
                      </p>
                      <span
                        className="text-[10px] text-muted"
                        title={format.dateTime(new Date(e.occurredAt), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      >
                        {format.relativeTime(new Date(e.occurredAt))}
                      </span>
                    </div>
                    {reason && (
                      <p className="mt-0.5 text-[11px] text-muted">
                        “{reason}”
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {/* Dialogs */}
      <ReasonForChangeDialog
        open={dialogOpen !== null}
        onClose={() => setDialogOpen(null)}
        title={activeRule?.label ?? t("confirm")}
        description={
          activeRule?.signature
            ? t("eSignatureDescription", { meaning: activeRule.signature })
            : undefined
        }
        warning={activeRule?.warning}
        pending={pending}
        errorMessage={error}
        onSubmit={submitTransition}
        primaryLabel={activeRule?.label}
      />

      <AssignReviewerDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        docId={docId}
        members={orgMembers}
      />
    </div>
  );
}
