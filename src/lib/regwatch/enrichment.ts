import { z } from "zod";
import { getAnthropic } from "@/lib/anthropic/client";
import { ENRICHMENT_MODEL } from "@/lib/regwatch/anthropic/models";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { TOPIC_TAXONOMY } from "@/lib/regwatch/taxonomy";
import {
  buildDocumentText,
  embedOne,
  isVoyageConfigured,
  toPgVectorLiteral,
} from "./voyage";

/**
 * Claude Haiku enrichment. Reads `enrichment_status = 'pending'` rows in
 * batches, asks Claude to extract topics / substances / NAICS codes / a clean
 * summary from the regulator-emitted title + body, then writes back and
 * flips status to 'enriched'. The same pass also generates a Voyage-3-large
 * 1024-dim embedding from regulator + title + summary so the row is ready
 * for vector retrieval as soon as it's enriched.
 *
 * Embeddings are best-effort: if Voyage is unconfigured or transient errors
 * occur, we still mark the row enriched (the embedding can be backfilled by
 * scripts/regwatch-voyage-backfill.mjs).
 */

const TOPIC_VALUES = TOPIC_TAXONOMY.map((t) => t.value);

/**
 * Models increasingly wrap JSON in markdown code fences (```json … ```) even
 * when asked not to. Strip the fence and isolate the outermost object so
 * JSON.parse succeeds regardless of surrounding prose.
 */
function extractJsonObject(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : raw).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

const enrichmentResultSchema = z.object({
  topics: z.array(z.enum(TOPIC_VALUES as [string, ...string[]])).max(8),
  substances_cas: z
    .array(z.string().regex(/^\d{1,7}-\d{2}-\d$/))
    .max(20),
  naics_codes: z.array(z.string().regex(/^\d{2,6}$/)).max(20),
  clean_summary: z.string().max(800),
});

type EnrichmentResult = z.infer<typeof enrichmentResultSchema>;

const SYSTEM_PROMPT = `You enrich regulatory item metadata for intelle.io RegWatch.

Given a regulator-published regulation's title + body, extract:
- topics: the most relevant RegWatch topic tags (max 5 from the allowed list)
- substances_cas: CAS numbers explicitly mentioned (verbatim, no inference)
- naics_codes: NAICS-2022 codes that obviously apply (max 8, 2-6 digit codes)
- clean_summary: a single plain-English paragraph (max 600 chars) summarising the regulation

Be conservative. Do not invent CAS numbers or NAICS codes. If the body is sparse, return short lists.

Allowed topic values: ${TOPIC_VALUES.join(", ")}.

Respond with ONLY a JSON object matching this schema (no markdown, no preamble):
{
  "topics": string[],
  "substances_cas": string[],
  "naics_codes": string[],
  "clean_summary": string
}`;

export interface EnrichmentRunResult {
  considered: number;
  enriched: number;
  failed: number;
  errors: string[];
}

export async function runEnrichmentBatch(
  batchSize = 8,
): Promise<EnrichmentRunResult> {
  const result: EnrichmentRunResult = {
    considered: 0,
    enriched: 0,
    failed: 0,
    errors: [],
  };
  const supabase = createServiceClient();

  const { data: pending, error } = await supabase
    .from("regulatory_items")
    .select(
      `id, title, citation, summary, body_text, jurisdiction_code,
       regulator:regulators!inner ( name, short_name )`,
    )
    .eq("enrichment_status", "pending")
    .order("ingested_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    result.errors.push(`pending query: ${error.message}`);
    return result;
  }
  const rows = pending ?? [];
  result.considered = rows.length;
  if (rows.length === 0) return result;

  const anthropic = getAnthropic();

  for (const row of rows) {
    try {
      const userMessage = `Title: ${row.title}
Citation: ${row.citation}
Jurisdiction: ${row.jurisdiction_code}
Existing summary: ${row.summary ?? "(none)"}
Body excerpt:
${(row.body_text ?? "").slice(0, 4000)}`;

      const message = await anthropic.messages.create({
        model: ENRICHMENT_MODEL,
        max_tokens: 600,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: userMessage }],
      });

      const text =
        message.content[0]?.type === "text" ? message.content[0].text : "";
      let parsed: EnrichmentResult;
      try {
        const obj = JSON.parse(extractJsonObject(text));
        parsed = enrichmentResultSchema.parse(obj);
      } catch (e) {
        result.failed += 1;
        result.errors.push(
          `parse ${row.citation}: ${(e as Error).message}`,
        );
        await markFailed(supabase, row.id);
        continue;
      }

      // Best-effort Voyage embedding from the freshly-cleaned text. If Voyage
      // is unconfigured or transient errors hit, we still mark the row
      // enriched and let the backfill script catch up later.
      const cleanSummary = parsed.clean_summary || row.summary;
      let embeddingLiteral: string | null = null;
      const reg = Array.isArray(row.regulator) ? row.regulator[0] : row.regulator;
      if (isVoyageConfigured()) {
        try {
          const docText = buildDocumentText({
            regulatorName:
              (reg?.short_name as string | null) ??
              (reg?.name as string | null) ??
              "Unknown regulator",
            jurisdictionCode: row.jurisdiction_code as string,
            title: row.title as string,
            summary: cleanSummary,
            citation: row.citation as string,
          });
          const vec = await embedOne(docText, { inputType: "document" });
          embeddingLiteral = toPgVectorLiteral(vec);
        } catch (e) {
          result.errors.push(
            `voyage ${row.citation}: ${(e as Error).message}`,
          );
        }
      }

      const updatePayload: Record<string, unknown> = {
        topics: parsed.topics,
        substances_cas: parsed.substances_cas,
        naics_codes: parsed.naics_codes,
        summary: cleanSummary,
        enrichment_status: "enriched",
        enrichment_metadata: {
          model: ENRICHMENT_MODEL,
          enriched_at: new Date().toISOString(),
          input_usage: message.usage,
          embedded: embeddingLiteral !== null,
        },
      };
      if (embeddingLiteral !== null) {
        updatePayload.embedding = embeddingLiteral;
      }

      const { error: updateError } = await supabase
        .from("regulatory_items")
        .update(updatePayload)
        .eq("id", row.id);

      if (updateError) {
        result.failed += 1;
        result.errors.push(`update ${row.citation}: ${updateError.message}`);
        continue;
      }
      result.enriched += 1;
    } catch (e) {
      result.failed += 1;
      result.errors.push(`anthropic ${row.citation}: ${(e as Error).message}`);
      await markFailed(supabase, row.id);
    }
  }

  return result;
}

async function markFailed(
  supabase: ReturnType<typeof createServiceClient>,
  id: string,
) {
  await supabase
    .from("regulatory_items")
    .update({ enrichment_status: "failed" })
    .eq("id", id);
}
