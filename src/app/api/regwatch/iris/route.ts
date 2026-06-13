import { z } from "zod";
import { getAnthropic } from "@/lib/anthropic/client";
import { getCustomerLLM, getPublicLLM } from "@/lib/llm/gateway";
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
import { searchInternalDocumentsHybrid } from "@/lib/regwatch/internal-document-search";

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

// Source/facet filters from the Search page picker. Optional on both request
// shapes; the floating chatbot widget omits them (→ searches the whole corpus).
const filterFields = {
  /** instrument_type allow-list. Empty array = match nothing (no sources picked). */
  instrumentTypes: z.array(z.string().max(60)).max(20).optional(),
  regulators: z.array(z.string().max(120)).max(50).optional(),
  topics: z.array(z.string().max(120)).max(50).optional(),
  statuses: z.array(z.string().max(60)).max(20).optional(),
  /** Company Docs source — also retrieve + cite the org's internal documents. */
  docs: z.boolean().optional(),
  docFolderIds: z.array(z.string().uuid()).max(200).optional(),
  includeUnfiled: z.boolean().optional(),
};

const requestSchema = z.union([
  z.object({ query: z.string().min(2).max(1500), ...filterFields }),
  z.object({
    messages: z.array(messageSchema).min(1).max(20),
    scopedItemId: z.string().uuid().optional(),
    /** "corpus" = Iris answers from the regulatory corpus (default).
     *  "help"   = Iris answers about how Vantage works (product Q&A). */
    mode: z.enum(["corpus", "help"]).optional(),
    ...filterFields,
  }),
]);

interface CitationSource {
  id: string;
  kind: "regulation" | "doc";
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
2. **Cite EVERY source you actually used.** If excerpts [1], [2], and [4] informed your answer, every one of them must appear as a [n] token in your prose. Don't cite [1] three times while ignoring [2] and [4] — distribute citations to the sources that actually supported each claim.
3. If a source is in the excerpts but is genuinely unused, just don't cite it (no need to mention every excerpt). But err on the side of citing more — readers see "Sources [1] [2] [3] [4]" in the side panel and expect to see those numbers appear inline.
4. Cluster citations when several sources back the same claim: "...applies to importers from 2026 [1][3]."
5. If the corpus excerpts do not cover the user's question, say so plainly. Do not invent regulations, citations, dates, or numerical thresholds.
6. Lead with a concise direct answer (1-3 sentences), then expand with structure if useful.
7. Use plain English. Define jargon on first use.
8. Never claim "hallucination-free" or omit citations to sound confident.
9. Do not output markdown code fences, headings beyond ## level, or HTML.
10. In multi-turn conversations, remember what the user has already asked — don't restate context they have, but DO re-cite [n] tokens each time you reference a specific claim (citations don't carry across turns automatically).

STRUCTURE:
- Direct answer first (1-3 sentences) — each substantive claim cited [n].
- Then a short "Detail" paragraph if the question warrants it — additional sources cited here.
- Then a "What to do next" line if and only if the user's question implies an action.

CITATION FORMAT:
Use bracketed integers: "EU CBAM applies from 2026 [1]." NEVER inline URLs. Multiple sources adjacent: [1][3]. The side panel renders [1] [2] [3] [4] … as the source list; every [n] you write must correspond to one of those.`;

const SYSTEM_PROMPT_HELP = `You are the Vantage product help assistant. Vantage is a regulatory monitoring + compliance authoring SaaS by intelle.io. You help users learn how to use the app — features, workflows, navigation, terminology.

WHAT VANTAGE DOES:
- Monitors regulatory changes across global publishers (EUR-Lex, US Federal Register, GOV.UK, IMO, ESMA, IEA, NSTA, ADNOC, SASO).
- Pull-model: users configure a Footprint (geographies, NAICS industries, monitored substances + topics + regulators) and Vantage's Relevance Feed scores incoming regulations against it.
- Browse view shows the publisher's full hierarchy (Title → Chapter → Subchapter → Part → Section for eCFR; analogous trees elsewhere) with amber "Updated 30d" markers — every section visible regardless of updates.
- Regulation detail page has two tabs: Articles (extracted body) and Original (cached source PDF/HTML, rendered in-app via react-pdf or sandboxed iframe).

INTERNAL DOCUMENTS:
- Author SOPs, Policies, Permits, Standards via the TipTap editor — saved as ProseMirror JSON.
- The Compose workspace pairs the editor with a reference picker (any regulation or internal doc) so users can click "Cite this clause" to drop a pinned citation pill (regId + clauseAnchor + pinnedVersion + displayText). When the source regulation updates past the pinned version, the doc's Citation Review Queue (in the Workflow drawer) flags the citation as stale.
- Crosswalk: section-to-clause traceability matrix that auditors expect.
- Versioning: every save picks major / minor / patch + a reason-for-change. Older revisions + their comments survive.
- Review workflow states: draft → in_review → approved → effective → superseded. Transitions require reason-for-change and capture an e-signature (21 CFR Part 11 / EU Annex 11 shape: name + timestamp + meaning + reason-for-change).
- Comments: top-level threads with replies, optional paragraph anchor, resolve / re-open.
- Audit trail PDF export: /api/regwatch/documents/[id]/audit-trail streams a Part 11-formatted PDF (signature manifest + chronological event log).

COMPLIANCE OBLIGATIONS:
- Asset × Regulation × Reviewer. Admins create obligations by pinning a regulation to an asset (and optionally a clause anchor), setting severity (catastrophic/critical/moderate/marginal/negligible) and compliance status (non-compliant/at-risk/compliant/unknown).
- Reviewers complete the review with evidence attachments + e-signature; review states are open/awaiting-triage/in-review/pending-approval/verified/closed/not-applicable.

NAVIGATION:
- Top nav surfaces: Discover (browse + regulators + topics + search), Monitor (Today + briefings + recap + saved + alerts), Comply (inbox + obligations + assets + footprint + checkup), Author (documents + folders + templates + compose + crosswalk), Settings.
- The "?" button in the nav opens the Help drawer with guided tours for: Footprint setup, Compose workspace, Crosswalk, Obligations + reviews.
- Iris (this assistant) is mounted in the bottom-right on every page — switch tabs between "Ask the corpus" and "Help · Vantage".

TIERS:
- Free: corpus browse + 10 Iris queries/day.
- Team: relevance feed, internal documents, obligations, audit-trail PDF, unlimited Iris.

ANSWERING RULES:
- Be concise and specific. Lead with the direct answer.
- Reference the exact menu / button / page name the user needs to click.
- When asked "how do I X?", explain the step-by-step path through the UI.
- If something is gated behind a paid tier, say so.
- If you don't know something product-specific, say so plainly — don't invent features.
- Plain English. Define jargon on first use.
- No markdown code fences, no bracketed citations (this mode doesn't use the corpus).`;

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

  // Normalise to {messages, scopedItemId, mode} shape.
  let messages: { role: "user" | "assistant"; content: string }[];
  let scopedItemId: string | undefined;
  let mode: "corpus" | "help" = "corpus";
  if ("query" in parsed) {
    messages = [{ role: "user", content: parsed.query }];
  } else {
    messages = parsed.messages;
    scopedItemId = parsed.scopedItemId;
    mode = parsed.mode ?? "corpus";
  }

  // Source/facet filters (present on both shapes; absent for the chatbot widget).
  const filters = {
    instrumentTypes: parsed.instrumentTypes,
    regulators: parsed.regulators,
    topics: parsed.topics,
    statuses: parsed.statuses,
    docs: parsed.docs ?? false,
    docFolderIds: parsed.docFolderIds,
    includeUnfiled: parsed.includeUnfiled ?? false,
  };

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

  // Help mode skips the corpus retrieval entirely — answers come from
  // the static product knowledge baked into SYSTEM_PROMPT_HELP.
  if (mode === "help") {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const sendEvt = (e: StreamEvent) =>
          controller.enqueue(encoder.encode(sse(e)));
        sendEvt({ type: "sources", sources: [] });
        try {
          const anthropic = getAnthropic();
          const apiStream = anthropic.messages.stream({
            model: IRIS_MODEL,
            max_tokens: 1024,
            system: [
              {
                type: "text",
                text: SYSTEM_PROMPT_HELP,
                cache_control: { type: "ephemeral" },
              },
            ],
            messages,
          });
          for await (const event of apiStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              sendEvt({ type: "delta", text: event.delta.text });
            }
          }
          sendEvt({ type: "done" });
          if (irisUser) {
            try {
              const svc = createServiceClient();
              await svc.from("audit_log").insert({
                organization_id: organizationId,
                user_id: irisUser.id,
                action: "iris_query",
                metadata: { tier, mode: "help" },
              });
            } catch (err) {
              console.error("[regwatch] iris help audit_log insert failed:", err);
            }
          }
        } catch (e) {
          sendEvt({
            type: "error",
            message: (e as Error).message ?? "Iris help stream failed",
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
      filter_instrument_types: filters.instrumentTypes ?? null,
      // Empty array → null so the RPC treats an empty facet as "no filter".
      filter_regulators: filters.regulators?.length ? filters.regulators : null,
      filter_topics: filters.topics?.length ? filters.topics : null,
      filter_statuses: filters.statuses?.length ? filters.statuses : null,
    });
    if (error) {
      // The hybrid RPC can time out on a large corpus. Degrade to fast pure
      // FTS (GIN-indexed) so Iris still answers from keyword matches instead
      // of surfacing a "Corpus query failed: …timeout" error to the user.
      console.error("[regwatch] iris hybrid rpc error — FTS fallback:", error);
      let fbQuery = supabase
        .from("regulatory_items")
        .select(
          `id, citation, slug, title, summary, instrument_type, status,
           effective_date, jurisdiction_code, source_url, body_text,
           regulator:regulators!inner ( name, short_name, slug )`,
        )
        .textSearch("body_search", latestUser.content, {
          type: "websearch",
          config: "english",
        });
      if (filters.instrumentTypes)
        fbQuery = fbQuery.in("instrument_type", filters.instrumentTypes);
      if (filters.regulators?.length)
        fbQuery = fbQuery.in("regulator.slug", filters.regulators);
      if (filters.topics?.length) fbQuery = fbQuery.overlaps("topics", filters.topics);
      if (filters.statuses?.length) fbQuery = fbQuery.in("status", filters.statuses);
      const fb = await fbQuery
        .order("last_changed_at", { ascending: false })
        .limit(6);
      if (fb.error)
        return sseErrorResponse(`Corpus query failed: ${fb.error.message}`);
      hits = (fb.data ?? []).map((row) => {
        const reg = Array.isArray(row.regulator)
          ? row.regulator[0]
          : row.regulator;
        return {
          id: row.id as string,
          citation: row.citation as string,
          title: row.title as string,
          slug: row.slug as string,
          summary: (row.summary as string | null) ?? null,
          instrument_type: row.instrument_type as string,
          status: row.status as string,
          effective_date: (row.effective_date as string | null) ?? null,
          jurisdiction_code: row.jurisdiction_code as string,
          source_url: row.source_url as string,
          body_text: (row.body_text as string | null) ?? null,
          regulator: {
            name: (reg?.name as string) ?? "",
            short_name: (reg?.short_name as string | null) ?? null,
          },
        };
      }) as typeof hits;
    } else {
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
  }

  let sources: CitationSource[] = hits.map((row) => ({
    id: row.id,
    kind: "regulation" as const,
    citation: row.citation,
    title: row.title,
    jurisdiction_code: row.jurisdiction_code,
    slug: row.slug,
    regulator: row.regulator?.short_name ?? row.regulator?.name ?? "Unknown regulator",
    source_url: row.source_url,
  }));

  let corpusBlock = hits
    .map((row, i) => {
      const excerpt = (row.body_text ?? row.summary ?? "").slice(0, 800);
      return `[${i + 1}] ${row.regulator?.name ?? ""} — ${row.title} (${row.citation}, ${row.jurisdiction_code}, ${row.status})\nEffective: ${row.effective_date ?? "n/a"}\n${excerpt}`;
    })
    .join("\n\n---\n\n");

  // Tracks whether any CUSTOMER document text was injected into the prompt. When
  // true, the completion routes to the customer LLM (intelleLLM when isolation is
  // on) so customer data never reaches a public model. Stays false for pure
  // public-regulation answers, which keep using Claude.
  let companyDocsInjected = false;

  // Company Docs — when enabled (Search page, signed-in member, not a scoped
  // single-regulation question), also retrieve the org's internal documents
  // (RLS-scoped) and append them as additional cited sources [n].
  if (filters.docs && irisUser && !scopedItemId) {
    try {
      const docHits = (
        await searchInternalDocumentsHybrid(latestUser.content, {
          folderIds: filters.docFolderIds,
          includeUnfiled: filters.includeUnfiled,
        })
      ).slice(0, 4);
      if (docHits.length > 0) {
        const { data: bodyRows } = await supabase
          .from("internal_documents")
          .select(
            "id, rev:internal_document_revisions!current_revision_id ( body_text )",
          )
          .in(
            "id",
            docHits.map((d) => d.id),
          );
        const bodyById = new Map<string, string>();
        for (const r of bodyRows ?? []) {
          const rev = (r as { rev?: { body_text?: string | null } | { body_text?: string | null }[] }).rev;
          const bt = Array.isArray(rev) ? rev[0]?.body_text : rev?.body_text;
          if (bt) bodyById.set((r as { id: string }).id, bt);
        }
        const offset = sources.length;
        const docSources: CitationSource[] = docHits.map((d) => ({
          id: d.id,
          kind: "doc" as const,
          citation: d.internalCode ?? d.docKind,
          title: d.title,
          jurisdiction_code: "",
          slug: "",
          regulator: d.folderName ? `Company doc · ${d.folderName}` : "Company document",
          source_url: "",
        }));
        const docBlock = docHits
          .map((d, i) => {
            const excerpt = (bodyById.get(d.id) ?? d.snippet ?? "")
              .replace(/⟦|⟧/g, "")
              .slice(0, 800);
            return `[${offset + i + 1}] [COMPANY DOCUMENT] ${d.title} (${d.internalCode ?? ""}, ${d.docKind})\n${excerpt}`;
          })
          .join("\n\n---\n\n");
        sources = [...sources, ...docSources];
        corpusBlock = corpusBlock ? `${corpusBlock}\n\n---\n\n${docBlock}` : docBlock;
        companyDocsInjected = true;
      }
    } catch (e) {
      console.error("[regwatch] iris company-docs retrieval failed:", e);
    }
  }

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
        // Route to the customer LLM (intelleLLM when isolation is on) iff any
        // company-document text was injected; pure public-regulation answers
        // stay on Claude. Isolation-off → both resolve to Claude + IRIS_MODEL.
        const { client, model } = companyDocsInjected
          ? getCustomerLLM(IRIS_MODEL)
          : getPublicLLM(IRIS_MODEL);
        const apiStream = client.messages.stream({
          model,
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
