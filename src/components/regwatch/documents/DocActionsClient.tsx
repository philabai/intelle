"use client";

import { useState } from "react";
import { DocSlideOver } from "./DocSlideOver";
import { ReviewPanel } from "./review/ReviewPanel";
import { StatePill } from "./review/StatePill";
import { LinkRegulationForm } from "./LinkRegulationForm";
import { ClauseCrosswalkPanel } from "./ClauseCrosswalkPanel";
import { LinkAssetsPanel } from "./LinkAssetsPanel";
import Link from "next/link";
import type { InternalDocumentReviewState } from "@/lib/regwatch/internal-documents";
import type {
  ReviewAssignment,
  SignatureRow,
  AuditEvent,
} from "@/lib/regwatch/internal-document-review";

interface ExistingRegLink {
  id: string;
  regulatoryItemId: string;
  regulationCitation: string;
  regulationTitle: string;
  jurisdictionCode: string;
  clauseAnchor: string | null;
  internalClauseAnchor: string | null;
  linkRationale: string | null;
  supersededAt: string | null;
}

interface AssetNode {
  id: string;
  parentId: string | null;
  level: 2 | 3 | 4 | 5 | 6;
  name: string;
  code: string | null;
}

interface LinkedAsset {
  linkId: string;
  assetId: string;
  assetName: string;
  assetLevel: number;
  assetCode: string | null;
}

interface OrgMemberOption {
  userId: string;
  displayName: string;
  email: string | null;
  role: string;
}

interface Props {
  documentId: string;

  // Review workflow
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

  // Linked regulations
  regulationLinks: ExistingRegLink[];

  // Clause linking — uses same regulation-links shape, filtered to crosswalk rows
  // (both anchors set) inside ClauseCrosswalkPanel.

  // Linked assets
  allAssets: AssetNode[];
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  currentAssetLinks: LinkedAsset[];
  composeHref: string;
}

type DrawerKey = "workflow" | "regulations" | "clauses" | "assets" | null;

const REVIEW_TONE: Record<InternalDocumentReviewState, string> = {
  draft: "bg-card-bg/60 text-muted border-card-border",
  in_review: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  approved: "bg-brand-blue/15 text-brand-blue border-brand-blue/40",
  effective: "bg-brand-teal/15 text-brand-teal border-brand-teal/40",
  superseded: "bg-card-bg/40 text-muted border-card-border",
};

/**
 * Action bar at the top of the doc detail page. Four buttons → four
 * slide-over drawers:
 *   - 📋 Workflow      (ReviewPanel: state pill, actions, sig manifest, audit)
 *   - 🔗 Regulations   (LinkRegulationForm: doc-level scope links)
 *   - ⛓ Clause linking (ClauseCrosswalkPanel: section ↔ clause map)
 *   - 📍 Assets        (LinkAssetsPanel: asset hierarchy pinning)
 *
 * Replaces the four-stacked-cards layout the page had previously. Counts
 * + review state are inline on each button so the at-a-glance status is
 * preserved without forcing the user into a drawer.
 */
export function DocActionsClient(props: Props) {
  const [drawer, setDrawer] = useState<DrawerKey>(null);

  const activeRegLinks = props.regulationLinks.filter((l) => !l.supersededAt);
  const crosswalkCount = activeRegLinks.filter(
    (l) =>
      !!l.clauseAnchor?.trim() && !!l.internalClauseAnchor?.trim(),
  ).length;
  const docLevelRegCount = activeRegLinks.filter(
    (l) =>
      !l.clauseAnchor?.trim() || !l.internalClauseAnchor?.trim(),
  ).length;
  const assetCount = props.currentAssetLinks.length;

  function close() {
    setDrawer(null);
  }

  function btnClass(active: boolean) {
    return `inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs ${
      active
        ? "border-brand-blue bg-brand-blue/15 text-foreground"
        : "border-card-border bg-background text-foreground/90 hover:border-brand-blue hover:text-foreground"
    }`;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-card-border bg-card-bg/40 p-3">
        <button
          type="button"
          onClick={() => setDrawer("workflow")}
          className={btnClass(drawer === "workflow")}
          title="Open the review workflow drawer — state, assignments, signatures, audit trail"
        >
          <span>📋</span>
          <span className="font-medium">Workflow</span>
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${REVIEW_TONE[props.reviewState]}`}
          >
            {props.reviewState.replace("_", " ")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setDrawer("regulations")}
          className={btnClass(drawer === "regulations")}
          title="Doc-level regulation links — 'this doc is in scope of these regulations'"
        >
          <span>🔗</span>
          <span className="font-medium">Linked regulations</span>
          {docLevelRegCount > 0 && (
            <span className="rounded-full bg-brand-teal/15 px-1.5 py-0.5 font-mono text-[10px] text-brand-teal">
              {docLevelRegCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setDrawer("clauses")}
          className={btnClass(drawer === "clauses")}
          title="Clause linking — section ↔ clause traceability matrix"
        >
          <span>⛓</span>
          <span className="font-medium">Clause linking</span>
          {crosswalkCount > 0 && (
            <span className="rounded-full bg-brand-teal/15 px-1.5 py-0.5 font-mono text-[10px] text-brand-teal">
              {crosswalkCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setDrawer("assets")}
          className={btnClass(drawer === "assets")}
          title="Pin this doc to sites / areas / asset classes / assets in the hierarchy"
        >
          <span>📍</span>
          <span className="font-medium">Linked assets</span>
          {assetCount > 0 && (
            <span className="rounded-full bg-brand-blue/15 px-1.5 py-0.5 font-mono text-[10px] text-brand-blue">
              {assetCount}
            </span>
          )}
        </button>

        <div className="ml-auto">
          <Link
            href={props.composeHref}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-teal/40 px-3 py-1.5 text-xs font-medium text-brand-teal hover:border-brand-teal hover:bg-brand-teal/10"
            title="Open the side-by-side workspace — regulation on the left, editor on the right. Click 'Cite this clause' to insert a pinned citation pill."
          >
            🔗 Citations
          </Link>
        </div>
      </div>

      {/* Workflow drawer */}
      <DocSlideOver
        open={drawer === "workflow"}
        onClose={close}
        title="Review workflow"
        subtitle={`Current state: ${props.reviewState.replace("_", " ")}`}
      >
        <ReviewPanel
          docId={props.documentId}
          reviewState={props.reviewState}
          ownerUserId={props.ownerUserId}
          ownerDisplayName={props.ownerDisplayName}
          currentUserId={props.currentUserId}
          currentUserRoleOnDoc={props.currentUserRoleOnDoc}
          isOrgAdmin={props.isOrgAdmin}
          assignments={props.assignments}
          signatures={props.signatures}
          auditEvents={props.auditEvents}
          orgMembers={props.orgMembers}
        />
      </DocSlideOver>

      {/* Linked regulations drawer */}
      <DocSlideOver
        open={drawer === "regulations"}
        onClose={close}
        title="Linked regulations"
        subtitle="Doc-level scope — this document is in scope of these regulations."
      >
        <LinkRegulationForm
          documentId={props.documentId}
          existingLinks={activeRegLinks}
        />
      </DocSlideOver>

      {/* Clause linking drawer */}
      <DocSlideOver
        open={drawer === "clauses"}
        onClose={close}
        title="Clause linking"
        subtitle="Section-to-clause traceability matrix — the depth view auditors look for."
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-muted">
            Map specific sections of <em>your</em> document to specific clauses
            of external regulations.
          </p>
          <Link
            href={`/regwatch/documents/${props.documentId}/crosswalk`}
            title="Open the side-by-side clause mapping workspace"
            className="rounded-md border border-brand-teal/40 px-2.5 py-1 text-[11px] font-medium text-brand-teal hover:border-brand-teal hover:bg-brand-teal/10"
          >
            Mapping workspace →
          </Link>
        </div>
        <ClauseCrosswalkPanel existingLinks={activeRegLinks} />
      </DocSlideOver>

      {/* Linked assets drawer */}
      <DocSlideOver
        open={drawer === "assets"}
        onClose={close}
        title="Linked assets"
      >
        <LinkAssetsPanel
          documentId={props.documentId}
          allAssets={props.allAssets}
          levelLabels={props.levelLabels}
          currentLinks={props.currentAssetLinks}
          canEdit={props.isOrgAdmin}
        />
      </DocSlideOver>
    </>
  );
}

// re-export StatePill so legacy importers still resolve
export { StatePill };
