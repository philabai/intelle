import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/regwatch/supabase/server";

export const runtime = "nodejs";

/**
 * Lightweight preview for the Search-page drawer. Returns a title, a meta line,
 * a truncated body, and the detail-page href for either a regulation (public
 * corpus) or an internal document (RLS-scoped to the caller's org).
 */

const MAX_BODY = 12_000;

const DOC_KIND_LABELS: Record<string, string> = {
  sop: "SOP",
  policy: "Policy",
  permit: "Permit",
  "work-instruction": "Work instruction",
  "training-material": "Training material",
  "validation-protocol": "Validation protocol",
  "risk-assessment": "Risk assessment",
  "internal-standard": "Internal standard",
  other: "Document",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind");
  const id = req.nextUrl.searchParams.get("id");
  if (!id || (kind !== "regulation" && kind !== "doc")) {
    return json({ error: "Invalid request" }, 400);
  }
  const supabase = await createClient();

  if (kind === "regulation") {
    const { data } = await supabase
      .from("regulatory_items")
      .select(
        `id, citation, title, summary, body_text, source_url, jurisdiction_code,
         slug, status, regulator:regulators!inner ( name, short_name )`,
      )
      .eq("id", id)
      .order("last_changed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return json({ error: "Not found" }, 404);
    const reg = Array.isArray(data.regulator) ? data.regulator[0] : data.regulator;
    return json({
      kind: "regulation",
      title: data.title,
      meta: [data.citation, data.jurisdiction_code, reg?.short_name ?? reg?.name, data.status]
        .filter(Boolean)
        .join(" · "),
      bodyText: (data.body_text ?? data.summary ?? "").slice(0, MAX_BODY),
      href: `/regwatch/r/${(data.jurisdiction_code as string).toLowerCase()}/${data.slug}`,
      sourceUrl: data.source_url ?? null,
    });
  }

  // kind === "doc" — RLS scopes to the caller's org; anon / wrong-org → no row.
  const { data } = await supabase
    .from("internal_documents")
    .select(
      `id, title, internal_code, doc_kind, version, status,
       folder:internal_document_folders ( name ),
       rev:internal_document_revisions!current_revision_id ( body_text )`,
    )
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  if (!data) return json({ error: "Not found" }, 404);
  const rev = Array.isArray(data.rev) ? data.rev[0] : data.rev;
  const folder = Array.isArray(data.folder) ? data.folder[0] : data.folder;
  const kindLabel =
    DOC_KIND_LABELS[data.doc_kind as string] ?? (data.doc_kind as string);
  return json({
    kind: "doc",
    title: data.title,
    meta: [
      kindLabel,
      data.internal_code,
      data.version ? `v${data.version}` : null,
      folder?.name,
    ]
      .filter(Boolean)
      .join(" · "),
    bodyText: (rev?.body_text ?? "").slice(0, MAX_BODY),
    href: `/regwatch/documents/${data.id}`,
    sourceUrl: null,
  });
}
