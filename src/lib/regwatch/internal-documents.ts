import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";

/**
 * Internal documents read-side. Mutations + uploads live in
 * internal-documents-actions.ts (server actions).
 */

export type InternalDocumentKind =
  | "sop"
  | "policy"
  | "permit"
  | "work-instruction"
  | "training-material"
  | "validation-protocol"
  | "risk-assessment"
  | "internal-standard"
  | "regulation"
  | "test-plan"
  | "project-document"
  | "lessons-learnt"
  | "design-document"
  | "drawing"
  | "other";

export type InternalDocumentStatus =
  | "draft"
  | "active"
  | "superseded"
  | "retired";

export const DOCUMENT_KIND_LABEL: Record<InternalDocumentKind, string> = {
  sop: "SOP",
  policy: "Policy",
  permit: "Permit",
  "work-instruction": "Work instruction",
  "training-material": "Training material",
  "validation-protocol": "Validation protocol",
  "risk-assessment": "Risk assessment",
  "internal-standard": "Internal standard",
  regulation: "Regulation",
  "test-plan": "Test plan",
  "project-document": "Project document",
  "lessons-learnt": "Lessons learnt",
  "design-document": "Design document",
  drawing: "Drawing",
  other: "Other",
};

export interface InternalDocumentListItem {
  id: string;
  organizationId: string;
  title: string;
  docKind: InternalDocumentKind;
  internalCode: string | null;
  version: string | null;
  ownerUserId: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  status: InternalDocumentStatus;
  effectiveDate: string | null;
  nextReviewDate: string | null;
  linkCount: number;
  assetLinkCount: number;
  filePath: string | null;
  fileName: string | null;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InternalDocumentDetail extends InternalDocumentListItem {
  ownerRole: string | null;
  description: string | null;
  fileSize: number | null;
  mimeType: string | null;
  links: InternalDocumentLink[];
  assetLinks: InternalDocumentAssetLink[];
}

export interface InternalDocumentLink {
  id: string;
  regulatoryItemId: string;
  regulationCitation: string;
  regulationTitle: string;
  jurisdictionCode: string;
  /** Anchor on the regulation side, e.g. "Article 6(2)". */
  clauseAnchor: string | null;
  /** Anchor on the internal document side, e.g. "§4.2" or "Section 3". */
  internalClauseAnchor: string | null;
  linkRationale: string | null;
  linkedAtItemVersion: string | null;
  supersededAt: string | null;
  createdAt: string;
}

/**
 * Derive whether a link is a coarse document-level mapping
 * ("this SOP covers this regulation in general") or a fine-grained
 * clause crosswalk entry ("§4.2 of our SOP maps to Article 6(2)").
 * A link is treated as crosswalk when BOTH anchors are present.
 */
export function isClauseCrosswalk(link: InternalDocumentLink): boolean {
  return (
    !!link.internalClauseAnchor?.trim() && !!link.clauseAnchor?.trim()
  );
}

export interface InternalDocumentAssetLink {
  id: string;
  assetId: string;
  assetName: string;
  assetLevel: number;
  assetCode: string | null;
  jurisdictionCode: string | null;
  linkRationale: string | null;
  createdAt: string;
}

export async function listDocuments(
  options: {
    includeRetired?: boolean;
    /**
     * Folder filter. Pass a UUID to fetch docs in that folder,
     * "unfiled" to fetch folder_id IS NULL,
     * or undefined to fetch every doc regardless of folder.
     */
    folderId?: string | "unfiled";
  } = {},
): Promise<InternalDocumentListItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("internal_documents")
    .select(
      `id, organization_id, title, doc_kind, internal_code, version, owner_user_id,
       status, effective_date, next_review_date, file_path, file_name,
       folder_id, created_at, updated_at`,
    )
    .order("updated_at", { ascending: false });
  if (!options.includeRetired) {
    q = q.not("status", "eq", "retired");
  }
  if (options.folderId === "unfiled") {
    q = q.is("folder_id", null);
  } else if (options.folderId) {
    q = q.eq("folder_id", options.folderId);
  }
  const { data, error } = await q;
  if (error || !data) {
    if (error) console.error("[regwatch] listDocuments:", error);
    return [];
  }

  // Per-doc link counts (regulations + assets) in two round-trips.
  const docIds = data.map((d) => d.id as string);
  const linksByDoc = new Map<string, number>();
  const assetLinksByDoc = new Map<string, number>();
  if (docIds.length > 0) {
    const { data: linkRows } = await supabase
      .from("internal_document_regulation_links")
      .select("internal_document_id")
      .in("internal_document_id", docIds)
      .is("superseded_at", null);
    for (const r of linkRows ?? []) {
      const id = r.internal_document_id as string;
      linksByDoc.set(id, (linksByDoc.get(id) ?? 0) + 1);
    }
    const { data: assetLinkRows } = await supabase
      .from("internal_document_asset_links")
      .select("internal_document_id")
      .in("internal_document_id", docIds);
    for (const r of assetLinkRows ?? []) {
      const id = r.internal_document_id as string;
      assetLinksByDoc.set(id, (assetLinksByDoc.get(id) ?? 0) + 1);
    }
  }

  // Owner email lookup via service-role (auth.users is RLS-fenced).
  const svc = createServiceClient();
  const ownerIds = Array.from(
    new Set(
      data
        .map((d) => d.owner_user_id as string | null)
        .filter((x): x is string => Boolean(x)),
    ),
  );
  const ownerById = new Map<string, { email: string | null; name: string | null }>();
  for (const id of ownerIds) {
    try {
      const { data: u } = await svc.auth.admin.getUserById(id);
      if (u.user) {
        ownerById.set(id, {
          email: u.user.email ?? null,
          name: (u.user.user_metadata?.full_name as string | undefined) ?? null,
        });
      }
    } catch {
      // best-effort
    }
  }

  return data.map((row) => {
    const ownerInfo = row.owner_user_id
      ? ownerById.get(row.owner_user_id as string)
      : undefined;
    return {
      id: row.id as string,
      organizationId: row.organization_id as string,
      title: row.title as string,
      docKind: row.doc_kind as InternalDocumentKind,
      internalCode: (row.internal_code as string | null) ?? null,
      version: (row.version as string | null) ?? null,
      ownerUserId: (row.owner_user_id as string | null) ?? null,
      ownerEmail: ownerInfo?.email ?? null,
      ownerName: ownerInfo?.name ?? null,
      status: row.status as InternalDocumentStatus,
      effectiveDate: (row.effective_date as string | null) ?? null,
      nextReviewDate: (row.next_review_date as string | null) ?? null,
      linkCount: linksByDoc.get(row.id as string) ?? 0,
      assetLinkCount: assetLinksByDoc.get(row.id as string) ?? 0,
      folderId: (row.folder_id as string | null) ?? null,
      filePath: (row.file_path as string | null) ?? null,
      fileName: (row.file_name as string | null) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  });
}

export async function getDocument(
  id: string,
): Promise<InternalDocumentDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("internal_documents")
    .select(
      `id, organization_id, title, doc_kind, internal_code, version,
       owner_user_id, owner_role, description, file_path, file_name,
       file_size, mime_type, status, effective_date, next_review_date,
       folder_id, created_at, updated_at`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const { data: linkRows } = await supabase
    .from("internal_document_regulation_links")
    .select(
      `id, regulatory_item_id, clause_anchor, internal_clause_anchor, link_rationale,
       linked_at_item_version, superseded_at, created_at,
       regulation:regulatory_items!inner ( citation, title, jurisdiction_code )`,
    )
    .eq("internal_document_id", id)
    .order("created_at", { ascending: false });
  type LinkRow = {
    id: string;
    regulatory_item_id: string;
    clause_anchor: string | null;
    internal_clause_anchor: string | null;
    link_rationale: string | null;
    linked_at_item_version: string | null;
    superseded_at: string | null;
    created_at: string;
    regulation:
      | { citation: string; title: string; jurisdiction_code: string }
      | { citation: string; title: string; jurisdiction_code: string }[];
  };
  const links: InternalDocumentLink[] = ((linkRows ?? []) as LinkRow[]).map((r) => {
    const reg = Array.isArray(r.regulation) ? r.regulation[0] : r.regulation;
    return {
      id: r.id,
      regulatoryItemId: r.regulatory_item_id,
      regulationCitation: reg?.citation ?? "(unknown)",
      regulationTitle: reg?.title ?? "(unknown)",
      jurisdictionCode: reg?.jurisdiction_code ?? "",
      clauseAnchor: r.clause_anchor,
      internalClauseAnchor: r.internal_clause_anchor,
      linkRationale: r.link_rationale,
      linkedAtItemVersion: r.linked_at_item_version,
      supersededAt: r.superseded_at,
      createdAt: r.created_at,
    };
  });

  // Asset links — multi-asset pinning. Loaded with the asset join so the
  // panel can render name/level/code without a second round-trip.
  const { data: assetLinkRows } = await supabase
    .from("internal_document_asset_links")
    .select(
      `id, asset_id, link_rationale, created_at,
       asset:assets!inner ( name, level, code, jurisdiction_code )`,
    )
    .eq("internal_document_id", id)
    .order("created_at", { ascending: false });
  type AssetLinkRow = {
    id: string;
    asset_id: string;
    link_rationale: string | null;
    created_at: string;
    asset:
      | { name: string; level: number; code: string | null; jurisdiction_code: string | null }
      | { name: string; level: number; code: string | null; jurisdiction_code: string | null }[];
  };
  const assetLinks: InternalDocumentAssetLink[] = ((assetLinkRows ?? []) as AssetLinkRow[]).map(
    (r) => {
      const a = Array.isArray(r.asset) ? r.asset[0] : r.asset;
      return {
        id: r.id,
        assetId: r.asset_id,
        assetName: a?.name ?? "(unknown asset)",
        assetLevel: a?.level ?? 0,
        assetCode: a?.code ?? null,
        jurisdictionCode: a?.jurisdiction_code ?? null,
        linkRationale: r.link_rationale,
        createdAt: r.created_at,
      };
    },
  );

  // Owner enrichment
  let ownerEmail: string | null = null;
  let ownerName: string | null = null;
  if (data.owner_user_id) {
    try {
      const svc = createServiceClient();
      const { data: u } = await svc.auth.admin.getUserById(
        data.owner_user_id as string,
      );
      ownerEmail = u.user?.email ?? null;
      ownerName =
        (u.user?.user_metadata?.full_name as string | undefined) ?? null;
    } catch {
      // ignore
    }
  }

  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    title: data.title as string,
    docKind: data.doc_kind as InternalDocumentKind,
    internalCode: (data.internal_code as string | null) ?? null,
    version: (data.version as string | null) ?? null,
    ownerUserId: (data.owner_user_id as string | null) ?? null,
    ownerEmail,
    ownerName,
    ownerRole: (data.owner_role as string | null) ?? null,
    description: (data.description as string | null) ?? null,
    status: data.status as InternalDocumentStatus,
    effectiveDate: (data.effective_date as string | null) ?? null,
    nextReviewDate: (data.next_review_date as string | null) ?? null,
    linkCount: links.filter((l) => !l.supersededAt).length,
    assetLinkCount: assetLinks.length,
    folderId: (data.folder_id as string | null) ?? null,
    filePath: (data.file_path as string | null) ?? null,
    fileName: (data.file_name as string | null) ?? null,
    fileSize: (data.file_size as number | null) ?? null,
    mimeType: (data.mime_type as string | null) ?? null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    links,
    assetLinks,
  };
}

/**
 * Returns internal documents linked to a given asset (or any of its
 * ancestors — used on the asset detail page to surface inherited docs).
 * The `inheritedFromAssetId` field is populated for ancestor matches.
 */
export interface AssetLinkedDocument {
  linkId: string;
  documentId: string;
  title: string;
  docKind: InternalDocumentKind;
  internalCode: string | null;
  version: string | null;
  ownerUserId: string | null;
  inheritedFromAssetId: string | null;
  inheritedFromAssetName: string | null;
  linkRationale: string | null;
}

export async function listDocumentsLinkedToAssetWithAncestors(
  assetId: string,
  ancestorIdsInOrder: string[],
): Promise<AssetLinkedDocument[]> {
  const supabase = await createClient();
  const allIds = [assetId, ...ancestorIdsInOrder];
  if (allIds.length === 0) return [];
  const { data, error } = await supabase
    .from("internal_document_asset_links")
    .select(
      `id, asset_id, link_rationale, created_at,
       asset:assets!inner ( id, name ),
       document:internal_documents!inner ( id, title, doc_kind, internal_code, version, owner_user_id )`,
    )
    .in("asset_id", allIds);
  if (error || !data) return [];
  type Row = {
    id: string;
    asset_id: string;
    link_rationale: string | null;
    asset: { id: string; name: string } | { id: string; name: string }[];
    document:
      | {
          id: string;
          title: string;
          doc_kind: InternalDocumentKind;
          internal_code: string | null;
          version: string | null;
          owner_user_id: string | null;
        }
      | {
          id: string;
          title: string;
          doc_kind: InternalDocumentKind;
          internal_code: string | null;
          version: string | null;
          owner_user_id: string | null;
        }[];
  };
  return (data as Row[]).map((r) => {
    const a = Array.isArray(r.asset) ? r.asset[0] : r.asset;
    const d = Array.isArray(r.document) ? r.document[0] : r.document;
    const inherited = r.asset_id !== assetId;
    return {
      linkId: r.id,
      documentId: d.id,
      title: d.title,
      docKind: d.doc_kind,
      internalCode: d.internal_code,
      version: d.version,
      ownerUserId: d.owner_user_id,
      inheritedFromAssetId: inherited ? a.id : null,
      inheritedFromAssetName: inherited ? a.name : null,
      linkRationale: r.link_rationale,
    };
  });
}

/**
 * Returns a 60-second signed URL for downloading a document. Caller must
 * already be an org member (RLS gates SELECT on the metadata; the signed-URL
 * call uses the storage bucket's own RLS — calling user must have org
 * membership reflected in the bucket-RLS path check).
 */
export async function getSignedDownloadUrl(
  filePath: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("regwatch-documents")
    .createSignedUrl(filePath, 60);
  if (error || !data) {
    console.error("[regwatch] signed url:", error);
    return null;
  }
  return data.signedUrl;
}
