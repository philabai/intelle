"use server";

import { z } from "zod";
import { createClient } from "./supabase/server";
import { fetchAndPersistRegulationBody } from "./body-fetch";
import { splitParagraphs, type BodyParagraph } from "./paragraph-split";

export type { BodyParagraph } from "./paragraph-split";

/**
 * Loads a regulation's full body for the clause-picker drawer. Returns the
 * structured paragraph list the client uses to render and let the user
 * "select" a clause.
 *
 * Body comes in three flavours in the corpus:
 *   - body_html — preferred; we feed the raw HTML to the client which sanitises
 *     and renders it
 *   - body_text — plain text; we split on double-newlines into paragraphs
 *   - summary fallback — when neither body field is populated (some seed items)
 *
 * The client also gets a "structured paragraphs" view computed here so it can
 * render a side-rail of paragraph anchors and emit a `clause_anchor` like
 * "¶12" or a detected heading like "Article 6" when the user picks one.
 */

export interface RegulationBody {
  id: string;
  citation: string;
  title: string;
  jurisdictionCode: string;
  regulatorName: string;
  status: string;
  sourceUrl: string;
  /** Plain-text paragraphs, in source order. */
  paragraphs: BodyParagraph[];
  /** Raw HTML when available — client can render with sanitisation if it prefers. */
  bodyHtml: string | null;
  /** True when paragraphs were derived from `summary` only (body fields empty). */
  summaryOnly: boolean;
}

const inputSchema = z.object({ id: z.string().uuid() });

export async function getRegulationBody(
  input: unknown,
): Promise<RegulationBody | null> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("regulatory_items")
    .select(
      `id, citation, title, jurisdiction_code, status, source_url,
       body_text, body_html, summary,
       regulator:regulators!inner ( name, short_name )`,
    )
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (error || !data) return null;

  const reg = Array.isArray(data.regulator) ? data.regulator[0] : data.regulator;
  const bodyText = (data.body_text as string | null) ?? "";
  const summary = (data.summary as string | null) ?? "";

  const sourceText = bodyText.trim().length > 0 ? bodyText : summary;
  const summaryOnly = bodyText.trim().length === 0;
  const paragraphs = splitParagraphs(sourceText);

  return {
    id: data.id as string,
    citation: data.citation as string,
    title: data.title as string,
    jurisdictionCode: data.jurisdiction_code as string,
    status: data.status as string,
    sourceUrl: data.source_url as string,
    regulatorName:
      (reg?.short_name as string | null) ??
      (reg?.name as string | null) ??
      "Unknown regulator",
    paragraphs,
    bodyHtml: (data.body_html as string | null) ?? null,
    summaryOnly,
  };
}

// ===========================================================================
// On-demand source fetch
// ---------------------------------------------------------------------------
// Bulk + cron-driven version lives in body-fetch.ts; this one is the user-
// invoked path from the viewer with auth-gating + a friendly error envelope.
// ===========================================================================

export interface FetchBodyResult {
  ok: boolean;
  body?: RegulationBody;
  error?: string;
  /** True when we fetched + persisted; false when nothing useful came back. */
  updated?: boolean;
  /** Number of characters extracted from the source page. */
  extractedChars?: number;
}

export async function fetchRegulationBodyFromSource(
  input: unknown,
): Promise<FetchBodyResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const result = await fetchAndPersistRegulationBody(parsed.data.id, user.id);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error ??
        "Could not fetch the source. Open the Source link to read it directly.",
      extractedChars: result.extractedChars,
    };
  }
  if (!result.updated) {
    return {
      ok: false,
      error: `Source page returned only ${result.extractedChars} chars of usable text — probably JS-rendered or behind a paywall. Use the Source link.`,
      extractedChars: result.extractedChars,
    };
  }
  const refreshed = await getRegulationBody({ id: parsed.data.id });
  return {
    ok: true,
    updated: true,
    extractedChars: result.extractedChars,
    body: refreshed ?? undefined,
  };
}
