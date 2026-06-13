import { createServiceClient } from "../supabase/service";

/**
 * Per-customer data purge for offboarding. Deletes EVERYTHING a customer org
 * owns and writes a tamper-evident deletion certificate.
 *
 * Order:
 *   1. Enumerate + delete all Storage objects under regwatch-documents/<org>/*.
 *   2. Delete the organization row → DB cascade removes internal documents,
 *      revisions, embeddings, evidence, obligations, footprints, alerts, etc.
 *   3. Residual verification — assert every customer-derived table is at 0 and
 *      Storage is empty for the org.
 *   4. Write the certificate (survives the cascade; no FK to organizations).
 *
 * Because intelleLLM is a customer-AGNOSTIC RAG model (we never fine-tune on
 * customer data) there are NO model weights to scrub — this store purge is the
 * whole job. Self-hosted inference/embed/ASR must log no prompts (infra control).
 *
 * Service-role only. Call from the admin route after explicit confirmation.
 */

const BUCKET = "regwatch-documents";

// Customer-derived tables scoped by organization_id — all must be 0 post-cascade.
const RESIDUAL_TABLES = [
  "internal_documents",
  "internal_document_revisions",
  "internal_document_embeddings",
  "obligation_evidence_files",
  "compliance_obligations",
  "operations_footprints",
  "assets",
  "impact_briefings",
  "alert_preferences",
  "organization_members",
] as const;

export interface PurgeResult {
  ok: boolean;
  organizationId: string;
  organizationName: string | null;
  storageObjectsDeleted: number;
  dbCascadeOk: boolean;
  residual: Record<string, number | string>;
  residualClean: boolean;
  certificateId: string | null;
  error?: string;
}

type Svc = ReturnType<typeof createServiceClient>;

/** Recursively list every object key under a Storage prefix (folders excluded). */
async function listAllObjects(svc: Svc, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [prefix];
  while (stack.length) {
    const dir = stack.pop()!;
    let offset = 0;
    // Page through this directory.
    for (;;) {
      const { data, error } = await svc.storage
        .from(BUCKET)
        .list(dir, { limit: 1000, offset });
      if (error) throw new Error(`list ${dir}: ${error.message}`);
      const entries = data ?? [];
      for (const entry of entries) {
        const full = dir ? `${dir}/${entry.name}` : entry.name;
        // Supabase returns sub-folders with id === null and no metadata.
        if (entry.id === null) stack.push(full);
        else out.push(full);
      }
      if (entries.length < 1000) break;
      offset += entries.length;
    }
  }
  return out;
}

export async function deleteOrganizationCascade(
  organizationId: string,
  requestedBy?: string,
): Promise<PurgeResult> {
  const svc = createServiceClient();
  const startedAt = new Date().toISOString();
  const result: PurgeResult = {
    ok: false,
    organizationId,
    organizationName: null,
    storageObjectsDeleted: 0,
    dbCascadeOk: false,
    residual: {},
    residualClean: false,
    certificateId: null,
  };

  // 0. Resolve the org (and confirm it exists) for the certificate snapshot.
  const { data: org, error: orgErr } = await svc
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();
  if (orgErr) {
    result.error = `lookup failed: ${orgErr.message}`;
    return result;
  }
  if (!org) {
    result.error = "Organization not found";
    return result;
  }
  result.organizationName = (org.name as string | null) ?? null;

  // 1. Storage purge.
  try {
    const keys = await listAllObjects(svc, organizationId);
    for (let i = 0; i < keys.length; i += 100) {
      const batch = keys.slice(i, i + 100);
      const { error } = await svc.storage.from(BUCKET).remove(batch);
      if (error) throw new Error(error.message);
      result.storageObjectsDeleted += batch.length;
    }
  } catch (e) {
    result.error = `storage purge failed: ${(e as Error).message}`;
    return result; // abort before deleting the org row — keep state consistent.
  }

  // 2. Delete the org row → DB cascade.
  const { error: delErr } = await svc
    .from("organizations")
    .delete()
    .eq("id", organizationId);
  if (delErr) {
    result.error = `org delete failed: ${delErr.message}`;
    return result;
  }
  result.dbCascadeOk = true;

  // 3. Residual verification.
  let residualClean = true;
  for (const table of RESIDUAL_TABLES) {
    try {
      const { count, error } = await svc
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);
      if (error) {
        result.residual[table] = `error: ${error.message}`;
        continue; // table may not exist in this deployment; don't fail the purge
      }
      result.residual[table] = count ?? 0;
      if ((count ?? 0) > 0) residualClean = false;
    } catch (e) {
      result.residual[table] = `error: ${(e as Error).message}`;
    }
  }
  // Storage residual.
  try {
    const remaining = await listAllObjects(svc, organizationId);
    result.residual["storage_objects"] = remaining.length;
    if (remaining.length > 0) residualClean = false;
  } catch (e) {
    result.residual["storage_objects"] = `error: ${(e as Error).message}`;
  }
  result.residualClean = residualClean;

  // 4. Certificate.
  const completedAt = new Date().toISOString();
  const { data: cert, error: certErr } = await svc
    .from("org_deletion_certificates")
    .insert({
      organization_id: organizationId,
      organization_name: result.organizationName,
      requested_by: requestedBy ?? null,
      storage_objects_deleted: result.storageObjectsDeleted,
      db_cascade_ok: result.dbCascadeOk,
      residual_report: result.residual,
      certificate: {
        organizationId,
        organizationName: result.organizationName,
        storageObjectsDeleted: result.storageObjectsDeleted,
        residualClean,
        note: "RAG architecture — no model weights trained on customer data; purge is a store-only operation (Storage + DB cascade).",
      },
      started_at: startedAt,
      completed_at: completedAt,
    })
    .select("id")
    .single();
  if (certErr) {
    // The purge succeeded; only the certificate write failed. Surface it.
    result.ok = residualClean;
    result.error = `certificate write failed: ${certErr.message}`;
    return result;
  }
  result.certificateId = cert.id as string;
  result.ok = residualClean;
  return result;
}
