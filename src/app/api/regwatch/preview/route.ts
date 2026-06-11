import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/regwatch/supabase/server";
import { ASSET_LEVEL_LABELS } from "@/lib/regwatch/assets";

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
  if (!id || (kind !== "regulation" && kind !== "doc" && kind !== "asset")) {
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

  if (kind === "asset") {
    // RLS scopes to the caller's org. Body = key attributes + obligations on it.
    const [{ data: asset }, { data: obls }] = await Promise.all([
      supabase
        .from("assets")
        .select("id, name, code, level, asset_type, jurisdiction_code, tags, substances_cas")
        .eq("id", id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("compliance_obligations")
        .select(
          "severity, compliance_status, reg:regulatory_items!compliance_obligations_regulatory_item_id_fkey ( citation )",
        )
        .eq("asset_id", id)
        .limit(20),
    ]);
    if (!asset) return json({ error: "Not found" }, 404);
    const lines: string[] = [];
    if (asset.asset_type) lines.push(`Type: ${asset.asset_type}`);
    if (asset.jurisdiction_code) lines.push(`Jurisdiction: ${asset.jurisdiction_code}`);
    if ((asset.tags as string[] | null)?.length) lines.push(`Tags: ${(asset.tags as string[]).join(", ")}`);
    if ((asset.substances_cas as string[] | null)?.length)
      lines.push(`Substances (CAS): ${(asset.substances_cas as string[]).join(", ")}`);
    const obList = (obls ?? []).map((o) => {
      const reg = Array.isArray(o.reg) ? o.reg[0] : o.reg;
      return `  • ${(reg as { citation?: string })?.citation ?? "—"} — ${o.severity} / ${o.compliance_status}`;
    });
    if (obList.length) lines.push("", `Obligations (${obList.length}):`, ...obList);
    else lines.push("", "No obligations pinned to this asset yet.");
    return json({
      kind: "asset",
      title: asset.name,
      meta: [ASSET_LEVEL_LABELS[asset.level as number] ?? `Level ${asset.level}`, asset.code]
        .filter(Boolean)
        .join(" · "),
      bodyText: lines.join("\n").slice(0, MAX_BODY),
      href: `/regwatch/assets?asset=${asset.id}`,
      sourceUrl: null,
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
