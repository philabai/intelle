import type { InternalDocumentReviewState } from "./internal-documents";

/**
 * Review workflow state machine. Source of truth for both the server
 * actions (transition guards) and the UI (which buttons to enable).
 *
 *   draft  ─submitForReview→  in_review  ─recordReview(approve)→  approved
 *                              │                                   │
 *                              ├─recordReview(request_changes)─→ draft
 *                              │                                   │
 *                              │                          markEffective↓
 *                              ↓                                effective
 *                            (back to draft on changes)             │
 *                                                              supersede↓
 *                                                            superseded
 *
 * Rules captured here once and reused everywhere — change the matrix
 * here and both the actions + UI follow.
 *
 * Notes on transitions:
 *   - "review approves" → approved
 *   - "review requests changes" → draft (with reason captured)
 *   - "approval after review" → not modeled separately in v1; the
 *      `recordApproval` action writes a signature with meaning='approved'
 *      while still in 'in_review' OR 'approved' (UI controls when it
 *      appears). For the canonical flow, recordReview by an Approver
 *      role works as combined review+approve.
 *   - "markEffective" can only run from 'approved'.
 *   - "supersede" can run from 'effective' (terminal).
 */

export type ReviewAction =
  | "submitForReview"
  | "recordReviewApprove"
  | "recordReviewRequestChanges"
  | "recordApproval"
  | "markEffective"
  | "supersede"
  | "withdrawReview"; // takes in_review back to draft (owner cancels)

export interface TransitionRule {
  /** Allowed starting states. */
  from: InternalDocumentReviewState[];
  /** Resulting state if the action succeeds. */
  to: InternalDocumentReviewState;
  /** Roles allowed to perform this action. */
  allowedRoles: ReadonlyArray<"owner" | "reviewer" | "approver" | "admin">;
  /** Whether a signature row is written (and with what meaning). */
  signature?: "authored" | "reviewed" | "approved";
  /** Human label surfaced on the action button. */
  label: string;
  /** Optional warning shown in the reason-for-change dialog. */
  warning?: string;
}

export const TRANSITIONS: Record<ReviewAction, TransitionRule> = {
  submitForReview: {
    from: ["draft"],
    to: "in_review",
    allowedRoles: ["owner", "admin"],
    signature: "authored",
    label: "Submit for review",
  },
  withdrawReview: {
    from: ["in_review"],
    to: "draft",
    allowedRoles: ["owner", "admin"],
    label: "Withdraw from review",
    warning:
      "Bringing this doc back to draft cancels any in-flight review. Reviewers are not auto-notified.",
  },
  recordReviewApprove: {
    from: ["in_review"],
    to: "approved",
    allowedRoles: ["reviewer", "approver", "admin"],
    signature: "reviewed",
    label: "Approve review",
  },
  recordReviewRequestChanges: {
    from: ["in_review"],
    to: "draft",
    allowedRoles: ["reviewer", "approver", "admin"],
    signature: "reviewed",
    label: "Request changes",
    warning:
      "Sends the doc back to draft. The author should address the reason for change, then re-submit for review.",
  },
  recordApproval: {
    from: ["in_review", "approved"],
    to: "approved",
    allowedRoles: ["approver", "admin"],
    signature: "approved",
    label: "Sign as approver",
  },
  markEffective: {
    from: ["approved"],
    to: "effective",
    allowedRoles: ["approver", "admin"],
    signature: "approved",
    label: "Mark as effective",
  },
  supersede: {
    from: ["effective"],
    to: "superseded",
    allowedRoles: ["owner", "approver", "admin"],
    label: "Supersede",
    warning:
      "Marks this doc as superseded. The replacement doc (if any) becomes the active version.",
  },
};

export function canTransition(
  action: ReviewAction,
  from: InternalDocumentReviewState,
  role: "owner" | "reviewer" | "approver" | "admin" | null,
): boolean {
  const rule = TRANSITIONS[action];
  if (!rule.from.includes(from)) return false;
  if (!role) return false;
  return rule.allowedRoles.includes(role);
}

export const REVIEW_STATE_LABEL: Record<InternalDocumentReviewState, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  effective: "Effective",
  superseded: "Superseded",
};

export const REVIEW_STATE_DESCRIPTION: Record<
  InternalDocumentReviewState,
  string
> = {
  draft:
    "Author is still working on the body. No signatures captured yet.",
  in_review:
    "Out for review. Assigned reviewers can sign with meaning='reviewed'; assigned approvers can sign with meaning='approved'.",
  approved:
    "All required signatures captured. Doc is ready to be marked effective.",
  effective:
    "In force. Linked obligations + crosswalk citations point at this version.",
  superseded:
    "A newer version is in force, or the doc has been retired. Read-only.",
};
