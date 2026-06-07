import { NextResponse } from "next/server";
import { createClient } from "@/lib/regwatch/supabase/server";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { getMyMembership } from "@/lib/regwatch/members";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { getReviewBundle } from "@/lib/regwatch/internal-document-review";
import {
  auditTrailToPdfBuffer,
  type AuditTrailPdfData,
} from "@/lib/regwatch/exports/audit-trail-pdf";

/**
 * GET /api/regwatch/documents/[id]/audit-trail
 *
 * Streams a freshly generated PDF audit trail for the doc. Auth + tier
 * + org-membership gated. Lives in its own route handler — not on the
 * doc detail page — so `@react-pdf/renderer` stays out of the page
 * bundle that already carries `react-pdf` + `pdfjs-dist`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await checkFeatureGate("internal_documents");
  if (!gate.allowed) {
    return NextResponse.json(
      { error: `Requires the ${gate.requiredTier} plan` },
      { status: 402 },
    );
  }

  const membership = await getMyMembership();
  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }
  const org = await getMyOrganization();

  const svc = createServiceClient();
  const { data: doc, error } = await svc
    .from("internal_documents")
    .select("id, organization_id, title, internal_code, version")
    .eq("id", id)
    .maybeSingle();
  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (doc.organization_id !== membership.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bundle = await getReviewBundle(doc.id, membership.organizationId);

  const generatedByDisplayName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    user.id;

  const payload: AuditTrailPdfData = {
    docTitle: (doc.title as string) ?? "Untitled document",
    docInternalCode: (doc.internal_code as string | null) ?? null,
    docVersion: (doc.version as string | null) ?? null,
    reviewState: bundle.reviewState,
    ownerDisplayName: bundle.ownerDisplayName,
    organizationName: org?.organization.name ?? "—",
    generatedAt: new Date().toISOString(),
    generatedByDisplayName,
    assignments: bundle.assignments,
    signatures: bundle.signatures,
    auditEvents: bundle.auditEvents,
  };

  const buffer = await auditTrailToPdfBuffer(payload);

  const safeTitle = payload.docTitle
    .replace(/[^a-zA-Z0-9\-_. ]+/g, "-")
    .slice(0, 80)
    .trim();
  const filename = `${safeTitle || "document"} — Audit Trail.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
