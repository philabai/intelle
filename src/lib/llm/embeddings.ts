import { getIntelleEmbedConfig } from "./config";

/**
 * Self-hosted embeddings for CUSTOMER documents (intelleLLM embedder, e.g. a TEI
 * / Infinity server exposing the OpenAI /v1/embeddings shape). STRICTLY separate
 * from voyage.ts — customer text must never be sent to Voyage. Used only when
 * intelleLLM isolation is enabled (see isIntelleEmbedEnabled in config.ts).
 *
 * Env: INTELLE_EMBED_BASE_URL, INTELLE_EMBED_MODEL, INTELLE_EMBED_API_KEY?,
 *      INTELLE_EMBED_DIM (default 1024 — must match the DB column dimension).
 */

const CHUNK = 64; // inputs per request

/** pgvector wants the literal "[v1,v2,...]" text form, not a JSON array. */
export function toPgVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function embedBatchCustomer(inputs: string[]): Promise<number[][]> {
  const cfg = getIntelleEmbedConfig();
  if (!cfg.baseUrl || !cfg.model) {
    throw new Error(
      "INTELLE_EMBED_BASE_URL / INTELLE_EMBED_MODEL are not set — cannot embed customer documents.",
    );
  }
  if (inputs.length === 0) return [];
  const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/embeddings`;

  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += CHUNK) {
    const chunk = inputs
      .slice(i, i + CHUNK)
      .map((s) => (s.trim().length === 0 ? " " : s));
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey ?? "intellellm"}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: cfg.model, input: chunk }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`intelle embed ${res.status}: ${body.slice(0, 240)}`);
    }
    const json = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    for (const d of sorted) {
      if (d.embedding.length !== cfg.dim) {
        throw new Error(
          `intelle embed dimension mismatch: got ${d.embedding.length}, expected ${cfg.dim} (INTELLE_EMBED_DIM / DB column).`,
        );
      }
      out.push(d.embedding);
    }
  }
  return out;
}

export async function embedOneCustomer(input: string): Promise<number[]> {
  const [v] = await embedBatchCustomer([input]);
  if (!v) throw new Error("intelle embedder returned no embedding");
  return v;
}
