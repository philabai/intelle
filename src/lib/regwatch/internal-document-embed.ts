import { createServiceClient } from "./supabase/service";
import { chunkBodyText } from "./internal-document-chunk";
import { embedBatchCustomer, toPgVectorLiteral } from "@/lib/llm/embeddings";
import { isIntelleEmbedEnabled } from "@/lib/llm/config";

/**
 * Generates self-hosted embeddings for CUSTOMER documents so company-doc search
 * can run the hybrid (vector + FTS) lane. Embeds the CURRENT revision of each
 * non-retired document that doesn't yet have embedding rows. Idempotent via the
 * unique(revision_id, chunk_index) constraint.
 *
 * Only does work when intelleLLM isolation + embedder are configured
 * (isIntelleEmbedEnabled). When off, company-doc search stays FTS-only and we
 * never embed customer text with a third party.
 */

export interface EmbedBacklogResult {
  enabled: boolean;
  considered: number;
  embeddedDocs: number;
  chunks: number;
  failed: number;
  errors: string[];
}

/** Embed one document revision: chunk → embed → replace its rows. */
async function embedRevision(args: {
  organizationId: string;
  internalDocumentId: string;
  revisionId: string;
  bodyText: string;
}): Promise<number> {
  const svc = createServiceClient();
  const chunks = chunkBodyText(args.bodyText);
  if (chunks.length === 0) return 0;

  const vectors = await embedBatchCustomer(chunks);
  const rows = chunks.map((text, i) => ({
    organization_id: args.organizationId,
    internal_document_id: args.internalDocumentId,
    revision_id: args.revisionId,
    chunk_index: i,
    chunk_text: text,
    embedding: toPgVectorLiteral(vectors[i]),
  }));

  // Replace any existing rows for this revision (idempotent re-runs).
  await svc
    .from("internal_document_embeddings")
    .delete()
    .eq("revision_id", args.revisionId);
  const { error } = await svc
    .from("internal_document_embeddings")
    .insert(rows);
  if (error) throw new Error(error.message);

  // Drop stale embeddings from superseded revisions of the same document.
  await svc
    .from("internal_document_embeddings")
    .delete()
    .eq("internal_document_id", args.internalDocumentId)
    .neq("revision_id", args.revisionId);

  return chunks.length;
}

export async function runInternalDocEmbedBacklog(
  batchSize = 10,
): Promise<EmbedBacklogResult> {
  const result: EmbedBacklogResult = {
    enabled: isIntelleEmbedEnabled(),
    considered: 0,
    embeddedDocs: 0,
    chunks: 0,
    failed: 0,
    errors: [],
  };
  if (!result.enabled) return result;

  const svc = createServiceClient();

  // Candidate documents: non-retired, with a current revision.
  const { data: docs, error: docErr } = await svc
    .from("internal_documents")
    .select("id, organization_id, current_revision_id")
    .neq("status", "retired")
    .not("current_revision_id", "is", null)
    .limit(500);
  if (docErr) {
    result.errors.push(`load docs: ${docErr.message}`);
    return result;
  }
  const candidates = (docs ?? []) as {
    id: string;
    organization_id: string;
    current_revision_id: string;
  }[];
  if (candidates.length === 0) return result;

  // Which current revisions already have embeddings?
  const revIds = candidates.map((d) => d.current_revision_id);
  const { data: have } = await svc
    .from("internal_document_embeddings")
    .select("revision_id")
    .in("revision_id", revIds);
  const embedded = new Set((have ?? []).map((r) => r.revision_id as string));

  const pending = candidates
    .filter((d) => !embedded.has(d.current_revision_id))
    .slice(0, batchSize);
  result.considered = pending.length;

  for (const d of pending) {
    try {
      const { data: rev } = await svc
        .from("internal_document_revisions")
        .select("body_text")
        .eq("id", d.current_revision_id)
        .maybeSingle();
      const bodyText = (rev?.body_text as string | null) ?? "";
      const n = await embedRevision({
        organizationId: d.organization_id,
        internalDocumentId: d.id,
        revisionId: d.current_revision_id,
        bodyText,
      });
      if (n > 0) {
        result.embeddedDocs += 1;
        result.chunks += n;
      }
    } catch (e) {
      result.failed += 1;
      result.errors.push(`${d.id}: ${(e as Error).message}`);
    }
  }
  return result;
}
