import { createClient } from "./supabase/server";

/**
 * Org-scoped roll-ups for the Weekly Recap's compliance panels. The SSR client
 * applies RLS, so these only ever see the calling user's org.
 */

export interface ObligationSummary {
  total: number;
  open: number; // open + awaiting-triage
  inReview: number; // in-review + pending-approval
  verified: number; // verified + closed
  critical: number; // severity critical / catastrophic
  atRisk: number; // compliance_status at-risk / non-compliant
}

export async function getObligationSummary(): Promise<ObligationSummary> {
  const s: ObligationSummary = { total: 0, open: 0, inReview: 0, verified: 0, critical: 0, atRisk: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compliance_obligations")
    .select("review_status, severity, compliance_status");
  if (error || !data) return s;
  for (const r of data) {
    s.total += 1;
    const rs = r.review_status as string;
    if (rs === "open" || rs === "awaiting-triage") s.open += 1;
    else if (rs === "in-review" || rs === "pending-approval") s.inReview += 1;
    else if (rs === "verified" || rs === "closed") s.verified += 1;
    if (r.severity === "critical" || r.severity === "catastrophic") s.critical += 1;
    if (r.compliance_status === "at-risk" || r.compliance_status === "non-compliant") s.atRisk += 1;
  }
  return s;
}

export interface DocumentSummary {
  total: number;
  draft: number; // being created
  inReview: number;
  live: number; // approved + effective
  openComments: number; // unresolved review comments
}

export async function getDocumentSummary(): Promise<DocumentSummary> {
  const s: DocumentSummary = { total: 0, draft: 0, inReview: 0, live: 0, openComments: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("internal_documents")
    .select("review_state");
  if (!error && data) {
    for (const r of data) {
      s.total += 1;
      const st = r.review_state as string;
      if (st === "draft") s.draft += 1;
      else if (st === "in_review") s.inReview += 1;
      else if (st === "approved" || st === "effective") s.live += 1;
    }
  }
  const { count } = await supabase
    .from("internal_document_comments")
    .select("id", { count: "exact", head: true })
    .is("resolved_at", null);
  s.openComments = count ?? 0;
  return s;
}
