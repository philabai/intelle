import { z } from "zod";
import { getAnthropic } from "@/lib/anthropic/client";
import { IRIS_MODEL } from "@/lib/regwatch/anthropic/models";
import { createClient } from "@/lib/regwatch/supabase/server";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { FREE_IRIS_DAILY_CAP, canUseFeature } from "@/lib/regwatch/tier";
import type { Tier } from "@/lib/regwatch/stripe";
import {
  embedOne,
  isVoyageConfigured,
  toPgVectorLiteral,
} from "@/lib/regwatch/voyage";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Iris Q&A endpoint — supports both the dedicated Search page (single-turn
 * via `query`) and the floating chatbot widget (multi-turn via `messages` +
 * optional `scopedItemId`).
 *
 * Behaviour:
 *   - Backwards-compatible: a body with just `query` still works.
 *   - Multi-turn: `messages` is the full conversation (user/assistant alternating).
 *     Only the latest user message drives the FTS retrieval; the rest is
 *     passed to Claude as conversation history so follow-ups have context.
 *   - Scoped: `scopedItemId` (a regulatory_items row id) forces retrieval to
 *     that one item — used by the in-context "Ask about this regulation"
 *     launcher on detail / briefing pages.
 */

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const requestSchema = z.union([
  z.object({ query: z.string().min(2).max(1500) }),
  z.object({
    messages: z.array(messageSchema).min(1).max(20),
    scopedItemId: z.string().uuid().optional(),
  }),
]);

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

const SYSTEM_PROMPT_BASE = `You are Iris, the AI concierge for Vantage by intelle.io — a regulatory monitoring product for compliance, EHS, legal, ESG, and government-affairs teams.

ANSWERING RULES:
1. Ground every substantive claim in the corpus excerpts you are given below. Reference each claim with a [n] token where n is the 1-based index of the source.
2. If the corpus excerpts do not cover the user's question, say so plainly. Do not invent regulations, citations, dates, or numerical thresholds.
3. Lead with a concise direct answer (1-3 sentences), then expand with structure if useful.
4. Use plain English. Define jargon on first use.
5. Never claim "hallucination-free" or omit citations to sound confident.
6. Do not output markdown code fences, headings beyond ## level, or HTML.
7. In multi-turn conversations, remember what the user has already asked — don't restate context they have, but DO re-cite [n] tokens each time you reference a specific claim (citations don't carry across turns automatically).

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

  // Normalise to {messages, scopedItemId} shape.
  let messages: { role: "user" | "assistant"; content: string }[];
  let scopedItemId: string | undefined;
  if ("query" in parsed) {
    messages = [{ role: "user", content: parsed.query }];
  } else {
    messages = parsed.messages;
    scopedItemId = parsed.scopedItemId;
  }

  // Latest user message drives retrieval.
  const latestUser = [...messages].reverse().find((m) => m.role === "user");
  if (!latestUser) {
    return new Response(JSON.stringify({ error: "No user message" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = await createClient();

  // ---- Tier gate: Free tier is capped at FREE_IRIS_DAILY_CAP queries/day ---
  // Resolve the caller's tier + (for non-Free) skip the cap check entirely.
  // Anonymous users (no session) are treated as Free.
  const {
    data: { user: irisUser },
  } = await supabase.auth.getUser();

  let tier: Tier = "free";
  let organizationId: string | null = null;
  if (irisUser) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id, organization:organizations!inner(tier)")
      .eq("user_id", irisUser.id)
      .limit(1)
      .maybeSingle();
    if (membership) {
      organizationId = membership.organization_id as string;
      const orgTier = Array.isArray(membership.organization)
        ? (membership.organization[0]?.tier as Tier | undefined)
        : ((membership.organization as { tier?: Tier } | null)?.tier);
      if (orgTier) tier = orgTier;
    }
  }

  if (!canUseFeature(tier, "unlimited_iris")) {
    // Count Iris queries by this user (or anon IP) in the last 24h.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const svc = createServiceClient();
    const { count } = await svc
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "iris_query")
      .eq("user_id", irisUser?.id ?? "00000000-0000-0000-0000-000000000000")
      .gte("created_at", since);
    if ((count ?? 0) >= FREE_IRIS_DAILY_CAP) {
      return sseErrorResponse(
        `Free plan is capped at ${FREE_IRIS_DAILY_CAP} Iris queries per 24h. Upgrade to Pro at /regwatch/settings/billing for unlimited Q&A.`,
      );
    }
  }

  // Retrieve corpus excerpts. When scoped, hit the one item directly.
  // Otherwise FTS the latest user message.
  let hits: Array<{
    id: string;
    citation: string;
    title: string;
    jurisdiction_code: string;
    slug: string;
    source_url: string;
    summary: string | null;
    body_text: string | null;
    status: string;
    effective_date: string | null;
    regulator: { name: string; short_name: string | null };
  }> = [];

  if (scopedItemId) {
    const { data, error } = await supabase
      .from("regulatory_items")
      .select(
        `id, citation, slug, title, summary, instrument_type, status,
         effective_date, jurisdiction_code, source_url, body_text,
         regulator:regulators!inner ( name, short_name )`,
      )
      .eq("id", scopedItemId)
      .limit(1);
    if (error) return sseErrorResponse(`Corpus query failed: ${error.message}`);
    hits = (data ?? []).map((row) => ({
      ...row,
      regulator: Array.isArray(row.regulator) ? row.regulator[0] : row.regulator,
    })) as typeof hits;
  } else {
    // Hybrid retrieval — embed the query, hit the RPC that blends vector
    // similarity with FTS rank. Falls back to FTS-only when Voyage isn't
    // configured or the embed call fails.
    let queryEmbeddingLiteral: string | null = null;
    if (isVoyageConfigured()) {
      try {
        const qvec = await embedOne(latestUser.content, { inputType: "query" });
        queryEmbeddingLiteral = toPgVectorLiteral(qvec);
      } catch (e) {
        console.error("[regwatch] iris query embed failed:", e);
      }
    }

    const { data, error } = await supabase.rpc("match_regulatory_items", {
      query_embedding: queryEmbeddingLiteral,
      query_text: latestUser.content,
      match_limit: 6,
      alpha: 0.65,
    });
    if (error) return sseErrorResponse(`Corpus query failed: ${error.message}`);
    hits = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      citation: row.citation as string,
      title: row.title as string,
      slug: row.slug as string,
      summary: (row.summary as string) ?? null,
      instrument_type: row.instrument_type as string,
      status: row.status as string,
      effective_date: (row.effective_date as string) ?? null,
      jurisdiction_code: row.jurisdiction_code as string,
      source_url: row.source_url as string,
      body_text: (row.body_text as string) ?? null,
      regulator: {
        name: row.regulator_name as string,
        short_name: (row.regulator_short as string) ?? null,
      },
    })) as typeof hits;
  }

  const sources: CitationSource[] = hits.map((row) => ({
    id: row.id,
    citation: row.citation,
    title: row.title,
    jurisdiction_code: row.jurisdiction_code,
    slug: row.slug,
    regulator: row.regulator?.short_name ?? row.regulator?.name ?? "Unknown regulator",
    source_url: row.source_url,
  }));

  const corpusBlock = hits
    .map((row, i) => {
      const excerpt = (row.body_text ?? row.summary ?? "").slice(0, 800);
      return `[${i + 1}] ${row.regulator?.name ?? ""} — ${row.title} (${row.citation}, ${row.jurisdiction_code}, ${row.status})\nEffective: ${row.effective_date ?? "n/a"}\n${excerpt}`;
    })
    .join("\n\n---\n\n");

  // Inject retrieved corpus as a system-style trailer on the LAST user message
  // so Claude sees the right context for its next reply. Earlier turns retain
  // their original content — we do NOT re-feed old corpus excerpts because the
  // model's previous responses already encode that context.
  const augmentedMessages = messages.map((m, idx) => {
    const isLastUser =
      m.role === "user" && idx === messages.findLastIndex((mm) => mm.role === "user");
    if (!isLastUser) return m;
    const scopedNote = scopedItemId
      ? "\n\n[Scope: this question is about the single regulation excerpted below.]"
      : "";
    const noResultsNote =
      sources.length === 0
        ? "\n\n[Note: the corpus search returned no matches for this question. Tell the user honestly, suggest broadening the query, do NOT fabricate citations.]"
        : `\n\nCorpus excerpts (cite as [n]):\n\n${corpusBlock}`;
    return { ...m, content: m.content + scopedNote + noResultsNote };
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(sse(e)));

      send({ type: "sources", sources });

      try {
        const anthropic = getAnthropic();
        const apiStream = anthropic.messages.stream({
          model: IRIS_MODEL,
          max_tokens: 1024,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT_BASE,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: augmentedMessages,
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

        // Record the query for the daily-cap counter (fire-and-forget).
        if (irisUser) {
          try {
            const svc = createServiceClient();
            await svc.from("audit_log").insert({
              organization_id: organizationId,
              user_id: irisUser.id,
              action: "iris_query",
              entity_type: scopedItemId ? "regulatory_item" : null,
              entity_id: scopedItemId ?? null,
              metadata: {
                tier,
                scoped: Boolean(scopedItemId),
                source_count: sources.length,
              },
            });
          } catch (err) {
            console.error("[regwatch] iris audit_log insert failed:", err);
          }
        }
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
