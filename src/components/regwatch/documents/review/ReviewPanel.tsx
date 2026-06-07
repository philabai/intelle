"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
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

const EVENT_LABEL: Record<string, string> = {
  created: "Created",
  updated_metadata: "Metadata updated",
  revision_saved: "Revision saved",
  revision_committed: "Revision committed",
  uploaded_file: "File uploaded",
  submitted_for_review: "Submitted for review",
  reviewer_assigned: "Reviewer assigned",
  approver_assigned: "Approver assigned",
  reviewer_completed: "Review approved",
  changes_requested: "Changes requested",
  approved: "Approval signed",
  marked_effective: "Marked effective",
  superseded: "Superseded",
  retired: "Retired",
  comment_added: "Comment added",
  comment_resolved: "Comment resolved",
  citation_inserted: "Citation inserted",
  citation_flagged_stale: "Citation flagged stale",
};

const SIG_MEANING_LABEL: Record<SignatureRow["meaning"], string> = {
  authored: "Authored",
  reviewed: "Reviewed",
  approved: "Approved",
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
        setError(res.error ?? "Could not perform action");
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
        setError(res.error ?? "Could not unassign");
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
            Review workflow
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
              + Assign reviewer
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAudit((v) => !v)}
            className="rounded-md border border-card-border bg-background px-2.5 py-1 text-[11px] text-muted hover:border-brand-blue hover:text-foreground"
          >
            {showAudit ? "Hide audit trail" : "Audit trail"}
          </button>
          <a
            href={`/api/regwatch/documents/${docId}/audit-trail`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-card-border bg-background px-2.5 py-1 text-[11px] text-muted hover:border-brand-blue hover:text-foreground"
            title="Download a Part-11-formatted PDF — signature manifest + event log"
          >
            ↓ Export PDF
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
          No actions available from <strong>{reviewState}</strong> with your
          role.
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
            Owner
          </p>
          {ownerUserId ? (
            <p className="text-xs text-foreground">
              {ownerDisplayName ?? ownerUserId}
            </p>
          ) : (
            <p className="text-[11px] text-muted">No owner assigned.</p>
          )}
        </div>
        <div className="rounded-md border border-card-border bg-background/40 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted">
            Open assignments
          </p>
          {openAssignments.length === 0 ? (
            <p className="text-[11px] text-muted">None yet.</p>
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
                      remove
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
          Signature manifest
        </p>
        {signatures.length === 0 ? (
          <p className="text-[11px] text-muted">
            No signatures yet. Submitting for review captures the author
            signature; reviewers + approvers sign on their actions.
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
                    <span className="font-medium">
                      {SIG_MEANING_LABEL[s.meaning]}
                    </span>{" "}
                    by {s.signerDisplayName}
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
                  title={new Date(s.signedAt).toLocaleString()}
                >
                  {formatDistanceToNowStrict(new Date(s.signedAt), {
                    addSuffix: true,
                  })}
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
            Audit trail ({auditEvents.length} events)
          </p>
          {auditEvents.length === 0 ? (
            <p className="text-[11px] text-muted">No events yet.</p>
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
                        <span className="font-medium">
                          {EVENT_LABEL[e.eventType] ?? e.eventType}
                        </span>{" "}
                        by {e.actorDisplayName}
                      </p>
                      <span
                        className="text-[10px] text-muted"
                        title={new Date(e.occurredAt).toLocaleString()}
                      >
                        {formatDistanceToNowStrict(new Date(e.occurredAt), {
                          addSuffix: true,
                        })}
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
        title={activeRule?.label ?? "Confirm"}
        description={
          activeRule?.signature
            ? `This action captures your e-signature with meaning='${activeRule.signature}' per 21 CFR Part 11.`
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
