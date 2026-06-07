"use client";

import { useState } from "react";
import Link from "next/link";
import { DocSlideOver } from "./DocSlideOver";
import { ReviewPanel } from "./review/ReviewPanel";
import { StatePill } from "./review/StatePill";
import { LinkRegulationForm } from "./LinkRegulationForm";
import { ClauseCrosswalkPanel } from "./ClauseCrosswalkPanel";
import { LinkAssetsPanel } from "./LinkAssetsPanel";
import { DocBodyPreviewCard } from "./editor/DocBodyPreviewCard";
import { CommentSidebar } from "./comments/CommentSidebar";
import type { InternalDocumentReviewState } from "@/lib/regwatch/internal-documents";
import type {
  ReviewAssignment,
  SignatureRow,
  AuditEvent,
} from "@/lib/regwatch/internal-document-review";
import type { CommentThread } from "@/lib/regwatch/internal-document-comments";
import type { StaleCitation } from "@/lib/regwatch/internal-document-citations";

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
  hasBody: boolean;
  hasFile: boolean;
  editHref: string;
  composeHref: string;

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

  // Linked regulations + clause linking (same row set, filtered inside the panel)
  regulationLinks: ExistingRegLink[];

  // Linked assets
  allAssets: AssetNode[];
  levelLabels: Record<2 | 3 | 4 | 5 | 6, string>;
  currentAssetLinks: LinkedAsset[];

  // Comments + citation freshness (PR-6)
  commentThreads: CommentThread[];
  openCommentCount: number;
  staleCitations: StaleCitation[];
}

type DrawerKey =
  | "workflow"
  | "regulations"
  | "clauses"
  | "assets"
  | "comments"
  | null;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

/* Single base style for every action-bar button so the bar reads as one
 * design language. Active = highlighted with the blue brand border.
 * Variants only differ by an icon glyph or — for the primary Edit — a
 * filled background. */
const BTN_BASE =
  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium";
const BTN_SECONDARY =
  "border-card-border bg-background text-foreground/90 hover:border-brand-blue hover:text-foreground";
const BTN_SECONDARY_ACTIVE =
  "border-brand-blue bg-brand-blue/15 text-foreground";
const BTN_PRIMARY =
  "border-brand-blue bg-brand-blue text-white hover:bg-brand-blue/90";

const REVIEW_TONE: Record<InternalDocumentReviewState, string> = {
  draft: "bg-card-bg/60 text-muted border-card-border",
  in_review: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  approved: "bg-brand-blue/15 text-brand-blue border-brand-blue/40",
  effective: "bg-brand-teal/15 text-brand-teal border-brand-teal/40",
  superseded: "bg-card-bg/40 text-muted border-card-border",
};

export function DocActionsClient(props: Props) {
  const [drawer, setDrawer] = useState<DrawerKey>(null);
  const [zoom, setZoom] = useState(1);

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
  const zoomPct = Math.round(zoom * 100);

  function close() {
    setDrawer(null);
  }
  function zoomOut() {
    setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  }
  function zoomIn() {
    setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  }

  function secondaryBtn(active: boolean): string {
    return `${BTN_BASE} ${active ? BTN_SECONDARY_ACTIVE : BTN_SECONDARY}`;
  }

  return (
    <>
      <div className="rounded-xl border border-card-border bg-card-bg/40 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Drawer triggers */}
          <button
            type="button"
            onClick={() => setDrawer("workflow")}
            className={secondaryBtn(drawer === "workflow")}
            title="Open the review workflow drawer — state, assignments, signatures, audit trail"
          >
            <span>📋</span>
            <span>Workflow</span>
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${REVIEW_TONE[props.reviewState]}`}
            >
              {props.reviewState.replace("_", " ")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDrawer("regulations")}
            className={secondaryBtn(drawer === "regulations")}
            title="Doc-level regulation links — 'this doc is in scope of these regulations'"
          >
            <span>🔗</span>
            <span>Linked regulations</span>
            {docLevelRegCount > 0 && (
              <span className="rounded-full bg-brand-teal/15 px-1.5 py-0.5 font-mono text-[10px] text-brand-teal">
                {docLevelRegCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDrawer("clauses")}
            className={secondaryBtn(drawer === "clauses")}
            title="Clause linking — section ↔ clause traceability matrix"
          >
            <span>⛓</span>
            <span>Clause linking</span>
            {crosswalkCount > 0 && (
              <span className="rounded-full bg-brand-teal/15 px-1.5 py-0.5 font-mono text-[10px] text-brand-teal">
                {crosswalkCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDrawer("assets")}
            className={secondaryBtn(drawer === "assets")}
            title="Pin this doc to sites / areas / asset classes / assets in the hierarchy"
          >
            <span>📍</span>
            <span>Linked assets</span>
            {assetCount > 0 && (
              <span className="rounded-full bg-brand-blue/15 px-1.5 py-0.5 font-mono text-[10px] text-brand-blue">
                {assetCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setDrawer("comments")}
            className={secondaryBtn(drawer === "comments")}
            title="Review comments — anchored threads, reply chains, resolve when addressed"
          >
            <span>💬</span>
            <span>Comments</span>
            {props.openCommentCount > 0 && (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                {props.openCommentCount}
              </span>
            )}
          </button>

          {/* Spacer pushes preview controls to the right */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {props.hasBody && (
              <div
                className={`${BTN_BASE} ${BTN_SECONDARY} gap-0 overflow-hidden p-0`}
                title="Zoom in / out on the preview"
              >
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={zoom <= ZOOM_MIN}
                  title="Zoom out"
                  className="px-2 py-1.5 hover:bg-card-bg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  title="Reset zoom to 100%"
                  className="border-x border-card-border px-2 py-1.5 font-mono text-[11px] hover:bg-card-bg"
                >
                  {zoomPct}%
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={zoom >= ZOOM_MAX}
                  title="Zoom in"
                  className="px-2 py-1.5 hover:bg-card-bg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  +
                </button>
              </div>
            )}

            <Link
              href={props.composeHref}
              className={`${BTN_BASE} ${BTN_SECONDARY}`}
              title="Open the side-by-side workspace — regulation on the left, editor on the right. Click 'Cite this clause' to insert a pinned citation pill."
            >
              <span>🔗</span>
              <span>Citations</span>
            </Link>

            {props.isOrgAdmin && (
              <Link
                href={props.editHref}
                className={`${BTN_BASE} ${BTN_PRIMARY}`}
                title={
                  props.hasBody
                    ? "Open the single-pane editor"
                    : "Start writing — opens the editor"
                }
              >
                <span>{props.hasBody ? "✎" : "✎"}</span>
                <span>{props.hasBody ? "Edit" : "Start writing"}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-6">
        <DocBodyPreviewCard
          documentId={props.documentId}
          hasBody={props.hasBody}
          hasFile={props.hasFile}
          zoom={zoom}
          canEdit={props.isOrgAdmin}
          editHref={props.editHref}
        />
      </div>

      {/* Drawers */}
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
          staleCitations={props.staleCitations}
        />
      </DocSlideOver>

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

      <DocSlideOver
        open={drawer === "clauses"}
        onClose={close}
        title="Clause linking"
        subtitle="Section-to-clause traceability matrix — the depth view auditors look for."
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-muted">
            Map specific sections of <em>your</em> document to specific clauses
            of external regulations.
          </p>
          <Link
            href={`/regwatch/documents/${props.documentId}/crosswalk`}
            className={`${BTN_BASE} ${BTN_SECONDARY} shrink-0`}
            title="Open the side-by-side clause mapping workspace"
          >
            Mapping workspace →
          </Link>
        </div>
        <ClauseCrosswalkPanel existingLinks={activeRegLinks} />
      </DocSlideOver>

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

      <DocSlideOver
        open={drawer === "comments"}
        onClose={close}
        title="Comments"
        subtitle="Review threads anchored to paragraphs or clauses. Bodies are immutable once posted; resolution is mutable."
      >
        <CommentSidebar
          docId={props.documentId}
          threads={props.commentThreads}
          currentUserId={props.currentUserId}
          canResolve={props.isOrgAdmin}
        />
      </DocSlideOver>
    </>
  );
}

export { StatePill };
