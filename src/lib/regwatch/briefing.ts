import { z } from "zod";
import { getAnthropic } from "@/lib/anthropic/client";
import { IMPACT_BRIEFING_MODEL } from "@/lib/regwatch/anthropic/models";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import type { MatchReason } from "./match";
import { topicLabel } from "./taxonomy";

/**
 * Impact briefing generator. Claude Opus produces the four Watershed-template
 * sections (Headline / Why it matters / Details / What to do now) for a
 * specific (regulatory_item, footprint) pair. Citations come from the corpus
 * itself — the regulator's source URL plus any related items used as context —
 * NOT asked of the LLM (Harvey anti-pattern from A.2). Trust markers count
 * green/amber/red verification states; v1 marks every citation green because
 * the only sources we feed the model are first-party corpus rows.
 *
 * Persisted to regwatch.impact_briefings. RLS keeps each org's briefings
 * scoped to their own membership.
 */

const SYSTEM_PROMPT = `You are the impact-briefing author for intelle.io RegWatch.

Given (1) a regulation, (2) the user's operations footprint, and (3) why the
regulation matched the footprint, produce a structured briefing for compliance,
EHS, legal, ESG, or government-affairs leaders.

Structure — emit EXACTLY this JSON shape, nothing else:
{
  "headline": string (1 sentence, max 200 chars; what this regulation does to *their* operations),
  "why_it_matters": string (2-4 sentences; why the user should care, anchored to their footprint),
  "details": string (3-6 sentences; specific obligations, thresholds, timelines),
  "what_to_do_now": string (3-6 sentences; concrete actions in the next 30/60/90 days),
  "deeper_resources": string (1-2 sentences; what to read next, who to consult)
}

CITATION RULES:
- Reference the regulation as [1] when you cite specific obligations.
- Do NOT invent CFR cites, dates, thresholds, or numerical figures absent from the corpus.
- If the corpus body doesn't contain enough detail to confidently answer a section, say so:
  "Full details on [aspect] are not in the corpus excerpt — review the regulator source."
- NEVER claim "hallucination-free." NEVER invent regulator quotes.

TONE: senior practitioner. No hedging boilerplate. Plain English. Define jargon (LDAR,
SVHC, CBAM) on first use. The reader is intelligent — don't over-explain context they
already have. Lead with the verb.`;

const briefingSchema = z.object({
  headline: z.string().min(10).max(400),
  why_it_matters: z.string().min(20),
  details: z.string().min(20),
  what_to_do_now: z.string().min(20),
  deeper_resources: z.string().min(5),
});
export type BriefingPayload = z.infer<typeof briefingSchema>;

export interface BriefingCitation {
  index: number;
  citation: string;
  title: string;
  jurisdiction_code: string;
  slug: string;
  regulator: string;
  source_url: string;
  trust: "green" | "amber" | "red";
}

export interface GenerateBriefingInput {
  /** footprint_matches row id (validates ownership via RLS). */
  matchId: string;
}

export interface GenerateBriefingResult {
  ok: boolean;
  briefingId?: string;
  error?: string;
}

export async function generateBriefingForMatch(
  input: GenerateBriefingInput,
): Promise<GenerateBriefingResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Read the match + joined item + regulator under RLS — confirms ownership.
  const { data: match, error: matchError } = await supabase
    .from("footprint_matches")
    .select(
      `id, score, severity, match_reason, organization_id, footprint_id,
       footprint:operations_footprints!inner (
         geographies, activities_naics, monitored_topics, substances_cas
       ),
       item:regulatory_items!inner (
         id, citation, title, summary, body_text, jurisdiction_code, slug, source_url,
         effective_date, consultation_closes_at, status, instrument_type, topics,
         regulator:regulators!inner ( name, short_name )
       )`,
    )
    .eq("id", input.matchId)
    .maybeSingle();

  if (matchError) return { ok: false, error: matchError.message };
  if (!match) return { ok: false, error: "Match not found or not yours" };

  const item = Array.isArray(match.item) ? match.item[0] : match.item;
  const regulator = Array.isArray(item.regulator) ? item.regulator[0] : item.regulator;
  const footprint = Array.isArray(match.footprint) ? match.footprint[0] : match.footprint;

  // Build the corpus excerpt fed to the model. We give Claude the regulation
  // body + summary, the footprint reason, and the footprint shape itself.
  const reason = match.match_reason as MatchReason | null;
  const whyLines: string[] = [];
  if (reason?.geo.matched) whyLines.push(`Geography overlap via ${reason.geo.via}`);
  if (reason?.regulator.matched) whyLines.push(`Followed regulator: ${reason.regulator.via}`);
  if (reason?.topic.matched.length)
    whyLines.push(`Topic overlap: ${reason.topic.matched.map(topicLabel).join(", ")}`);
  if (reason?.naics.matched.length)
    whyLines.push(`NAICS overlap: ${reason.naics.matched.join(", ")}`);
  if (reason?.substance.matched.length)
    whyLines.push(`Substance overlap: ${reason.substance.matched.join(", ")}`);

  const userMessage = `# Regulation [1]
Title: ${item.title}
Citation: ${item.citation}
Jurisdiction: ${item.jurisdiction_code}
Regulator: ${regulator.name}${regulator.short_name ? ` (${regulator.short_name})` : ""}
Status: ${item.status}
Instrument type: ${item.instrument_type}
Effective date: ${item.effective_date ?? "n/a"}
Consultation closes: ${item.consultation_closes_at ?? "n/a"}
Topics: ${(item.topics ?? []).map((t: string) => topicLabel(t)).join(", ") || "n/a"}

Existing summary: ${item.summary ?? "(none)"}

Body excerpt:
${(item.body_text ?? "").slice(0, 6000)}

# User's footprint
Geographies: ${footprint.geographies.join(", ") || "(none)"}
Activities (NAICS): ${footprint.activities_naics.join(", ") || "(none)"}
Monitored topics: ${footprint.monitored_topics.join(", ") || "(none)"}
Substances (CAS): ${footprint.substances_cas.join(", ") || "(none)"}

# Why this matched the footprint (score ${match.score}/100, ${match.severity})
${whyLines.join("\n") || "(no overlap detail)"}

Produce the briefing JSON now. Remember: [1] is the regulation above; cite it where you reference specific obligations.`;

  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model: IMPACT_BRIEFING_MODEL,
    max_tokens: 1600,
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
  let parsed: BriefingPayload;
  try {
    const obj = JSON.parse(stripCodeFences(text));
    parsed = briefingSchema.parse(obj);
  } catch (e) {
    return {
      ok: false,
      error: `Briefing parse failed: ${(e as Error).message}`,
    };
  }

  // Build the citation set. v1 ships with one canonical citation — the
  // regulation itself — marked green because it IS the corpus row. Phase 1.x
  // will expand to related-item citations resolved from match_reason.
  const citations: BriefingCitation[] = [
    {
      index: 1,
      citation: item.citation,
      title: item.title,
      jurisdiction_code: item.jurisdiction_code,
      slug: item.slug,
      regulator: regulator.short_name ?? regulator.name,
      source_url: item.source_url,
      trust: "green",
    },
  ];
  const trustMarkers = {
    green: citations.filter((c) => c.trust === "green").length,
    amber: 0,
    red: 0,
  };

  // Persist via service role — RLS forbids INSERT into impact_briefings for
  // authenticated users (pipeline-only writes). The user_id is captured in
  // requested_by for audit.
  const svc = createServiceClient();
  const { data: inserted, error: insertError } = await svc
    .from("impact_briefings")
    .insert({
      organization_id: match.organization_id,
      regulatory_item_id: item.id,
      footprint_id: match.footprint_id,
      headline: parsed.headline,
      why_it_matters: parsed.why_it_matters,
      details: parsed.details,
      what_to_do_now: parsed.what_to_do_now,
      deeper_resources: parsed.deeper_resources,
      citations: citations as unknown as Record<string, unknown>[],
      trust_markers: trustMarkers,
      generation_metadata: {
        model: IMPACT_BRIEFING_MODEL,
        generated_at: new Date().toISOString(),
        usage: message.usage,
        match_id: match.id,
        match_score: match.score,
        match_severity: match.severity,
      },
      requested_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: insertError?.message ?? "Insert failed" };
  }

  return { ok: true, briefingId: inserted.id };
}

function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}
