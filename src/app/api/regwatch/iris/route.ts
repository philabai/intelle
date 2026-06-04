import { z } from "zod";
import { getAnthropic } from "@/lib/anthropic/client";
import { IRIS_MODEL } from "@/lib/regwatch/anthropic/models";
import { createClient } from "@/lib/regwatch/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  query: z.string().min(2).max(1500),
});

interface CitationSource {
  id: string;
  citation: string;
  title: string;
  jurisdiction_code: string;
  slug: string;
  regulator: string;
  source_url: string;
}

type StreamEvent =
  | { type: "sources"; sources: CitationSource[] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

function sse(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

const SYSTEM_PROMPT = `You are Iris, the AI concierge for intelle.io RegWatch — a regulatory monitoring product for compliance, EHS, legal, ESG, and government-affairs teams.

ANSWERING RULES:
1. Ground every substantive claim in the corpus excerpts you are given below. Reference each claim with a [n] token where n is the 1-based index of the source.
2. If the corpus excerpts do not cover the user's question, say so plainly. Do not invent regulations, citations, dates, or numerical thresholds.
3. Lead with a concise direct answer (1-3 sentences), then expand with structure if useful.
4. Use plain English. Define jargon on first use.
5. Never claim "hallucination-free" or omit citations to sound confident.
6. Do not output markdown code fences, headings beyond ## level, or HTML.

STRUCTURE:
- Direct answer first (1-3 sentences).
- Then a short "Detail" paragraph if the question warrants it.
- Then a "What to do next" line if and only if the user's question implies an action.

CITATION FORMAT:
Use bracketed integers: "EU CBAM applies from 2026 [1]." NEVER inline URLs.`;

export async function POST(request: Request) {
  let parsed: z.infer<typeof requestSchema>;
  try {
    const body = await request.json();
    parsed = requestSchema.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = await createClient();

  // Retrieve corpus excerpts via FTS — pgvector semantic retrieval comes
  // online once Phase 1.3 enrichment populates the embedding column.
  const { data: hits, error: ftsError } = await supabase
    .from("regulatory_items")
    .select(
      `id, citation, slug, title, summary, instrument_type, status,
       effective_date, jurisdiction_code, source_url, body_text,
       regulator:regulators!inner ( name, short_name )`,
    )
    .textSearch("body_search", parsed.query, {
      type: "websearch",
      config: "english",
    })
    .limit(6);

  if (ftsError) {
    return sseErrorResponse(`Corpus query failed: ${ftsError.message}`);
  }

  const sources: CitationSource[] = (hits ?? []).map((row) => {
    const reg = Array.isArray(row.regulator) ? row.regulator[0] : row.regulator;
    return {
      id: row.id,
      citation: row.citation,
      title: row.title,
      jurisdiction_code: row.jurisdiction_code,
      slug: row.slug,
      regulator: reg?.short_name ?? reg?.name ?? "Unknown regulator",
      source_url: row.source_url,
    };
  });

  // Build the corpus block fed into Claude. Each excerpt is numbered so the
  // model can reference it as [n]. body_text is truncated to keep token cost
  // bounded; the full body lives at the detail page the user can click into.
  const corpusBlock = (hits ?? [])
    .map((row, i) => {
      const reg = Array.isArray(row.regulator) ? row.regulator[0] : row.regulator;
      const excerpt = (row.body_text ?? row.summary ?? "").slice(0, 800);
      return `[${i + 1}] ${reg?.name ?? ""} — ${row.title} (${row.citation}, ${row.jurisdiction_code}, ${row.status})\nEffective: ${row.effective_date ?? "n/a"}\n${excerpt}`;
    })
    .join("\n\n---\n\n");

  const userMessage =
    sources.length === 0
      ? `The user asked: "${parsed.query}". The corpus returned no matching excerpts. Tell the user honestly that no items matched, and suggest they broaden the query or browse by jurisdiction. Do NOT fabricate citations.`
      : `The user asked: "${parsed.query}".\n\nCorpus excerpts (cite as [n]):\n\n${corpusBlock}`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(sse(e)));

      send({ type: "sources", sources });

      try {
        const anthropic = getAnthropic();
        // NOTE: do NOT await this — `messages.stream` returns a MessageStream
        // synchronously. Awaiting it collapses to the final message and the
        // for-await loop runs after generation is done, defeating SSE.
        const apiStream = anthropic.messages.stream({
          model: IRIS_MODEL,
          max_tokens: 1024,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userMessage }],
        });

        for await (const event of apiStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send({ type: "delta", text: event.delta.text });
          }
        }
        send({ type: "done" });
      } catch (e) {
        send({
          type: "error",
          message: (e as Error).message ?? "Iris stream failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function sseErrorResponse(message: string): Response {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(sse({ type: "error", message })));
      controller.enqueue(encoder.encode(sse({ type: "done" })));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
