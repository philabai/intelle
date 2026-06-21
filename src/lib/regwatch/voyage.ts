/**
 * Voyage AI client for RegWatch.
 *
 * voyage-3-large produces 1024-dim embeddings, which matches the
 * `regwatch.regulatory_items.embedding` column dimension (vector(1024)).
 *
 * Env: VOYAGE_API_KEY (server-only).
 *
 * No SDK — direct REST. Voyage's API is a single POST.
 */

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
export const VOYAGE_MODEL = "voyage-3-large";
export const VOYAGE_DIM = 1024;
/** Per-request ceiling so a throttled Voyage can't stall the enrichment cron. */
const VOYAGE_TIMEOUT_MS = Number(process.env.VOYAGE_TIMEOUT_MS) || 8000;

/** Voyage embedding "input_type" — narrows the projection for retrieval vs. ingest. */
export type VoyageInputType = "document" | "query";

export interface VoyageEmbedOptions {
  /**
   * "document" for items being ingested into the corpus, "query" for the
   * user's search string at query time. Voyage's two projections are
   * specifically tuned so a query embedding cosines best against documents
   * embedded as "document" — mixing them up degrades recall.
   */
  inputType: VoyageInputType;
}

export function isVoyageConfigured(): boolean {
  return Boolean(process.env.VOYAGE_API_KEY);
}

/**
 * Embed a batch of texts in a single call. Voyage caps at 128 inputs and
 * ~120k tokens per request — we conservatively chunk at 64.
 *
 * Returns one float[1024] per input, in the same order.
 */
export async function embedBatch(
  inputs: string[],
  opts: VoyageEmbedOptions,
): Promise<number[][]> {
  if (!isVoyageConfigured()) {
    throw new Error("VOYAGE_API_KEY is not set");
  }
  if (inputs.length === 0) return [];

  const out: number[][] = [];
  const CHUNK = 64;
  for (let i = 0; i < inputs.length; i += CHUNK) {
    const chunk = inputs.slice(i, i + CHUNK);
    // Voyage rejects empty strings — substitute a single space so length aligns.
    const safe = chunk.map((s) => (s.trim().length === 0 ? " " : s));

    const res = await fetch(VOYAGE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: safe,
        input_type: opts.inputType,
        output_dimension: VOYAGE_DIM,
      }),
      // Hard cap so a slow/rate-limited Voyage can never hang a caller. The
      // enrichment cron treats embeddings as best-effort, so a timeout here just
      // skips the embedding rather than burning the whole function budget.
      signal: AbortSignal.timeout(VOYAGE_TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Voyage ${res.status}: ${body.slice(0, 240)}`);
    }
    const json = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };
    // Voyage returns items keyed by index — sort to be safe.
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    out.push(...sorted.map((d) => d.embedding));
  }
  return out;
}

export async function embedOne(
  input: string,
  opts: VoyageEmbedOptions,
): Promise<number[]> {
  const [v] = await embedBatch([input], opts);
  if (!v) throw new Error("Voyage returned no embedding");
  return v;
}

/**
 * Stable text the embedding is computed from. Centralised so the same input
 * shape is used at ingest, backfill, and (for queries) at retrieval time —
 * deviating between these guarantees recall regressions.
 *
 * Heuristic: prepend regulator + jurisdiction so the vector picks up the
 * regulatory voice, then title + summary. Body is excluded to keep token
 * counts bounded and because regulatory bodies are often boilerplate.
 */
export function buildDocumentText(input: {
  regulatorName: string;
  jurisdictionCode: string;
  title: string;
  summary: string | null;
  citation?: string | null;
}): string {
  const parts = [
    `${input.regulatorName} (${input.jurisdictionCode})`,
    input.citation ?? "",
    input.title,
    input.summary ?? "",
  ];
  return parts.filter(Boolean).join("\n").slice(0, 6000);
}

/**
 * pgvector wants the literal "[v1,v2,...]" string form when written via
 * supabase-js — it isn't a real JSON array on the wire, it's pgvector text.
 */
export function toPgVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
