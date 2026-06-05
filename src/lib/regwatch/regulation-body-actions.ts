"use server";

import { z } from "zod";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";

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

export interface BodyParagraph {
  /** Source-order index, used as a fallback anchor (e.g. "¶12"). */
  index: number;
  text: string;
  /** Detected heading anchor (e.g. "Article 6", "§ 261.4(b)(7)") when matched. */
  detectedAnchor: string | null;
  /** True when this paragraph looks like a heading (used for nav rail). */
  isHeading: boolean;
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

// ---------------------------------------------------------------------------
// Paragraph + heading detection
// ---------------------------------------------------------------------------

// Regex set covering common regulatory heading conventions across our corpus.
// Order matters — first match wins. Examples we want to catch:
//   "Article 6", "Section 12.3", "§ 261.4(b)(7)", "Annex IV", "Schedule 2",
//   "Chapter 3", "Part 5", "Rule 12(a)", "Sub-paragraph (3)".
const HEADING_PATTERNS: { re: RegExp; format: (m: RegExpMatchArray) => string }[] = [
  {
    re: /^(article)\s+([0-9IVXLCDM]+(?:[a-z]?)(?:\.\d+)*)/i,
    format: (m) => `Article ${m[2]}`,
  },
  {
    re: /^(§|section)\s*([0-9]+(?:[a-z]?)(?:\.\d+)*(?:\([a-z0-9]+\))*)/i,
    format: (m) => `§ ${m[2]}`,
  },
  {
    re: /^(annex|appendix)\s+([0-9IVXLCDM]+(?:[a-z]?))/i,
    format: (m) => `${capitalise(m[1])} ${m[2].toUpperCase()}`,
  },
  {
    re: /^(schedule)\s+([0-9IVXLCDM]+)/i,
    format: (m) => `Schedule ${m[2]}`,
  },
  {
    re: /^(chapter|part|title)\s+([0-9IVXLCDM]+(?:\.\d+)*)/i,
    format: (m) => `${capitalise(m[1])} ${m[2]}`,
  },
  {
    re: /^(rule)\s+([0-9]+(?:\([a-z0-9]+\))*)/i,
    format: (m) => `Rule ${m[2]}`,
  },
  {
    re: /^(paragraph|para)\s+([0-9]+(?:\([a-z0-9]+\))*)/i,
    format: (m) => `¶ ${m[2]}`,
  },
];

function detectAnchor(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;
  for (const { re, format } of HEADING_PATTERNS) {
    const m = trimmed.match(re);
    if (m) return format(m);
  }
  return null;
}

function looksLikeHeading(line: string, anchor: string | null): boolean {
  if (anchor) return true;
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  // Heuristic: short line in all-caps with no terminal punctuation often = heading.
  if (trimmed.length <= 120 && /^[A-Z0-9\s\-—:,()/]+$/.test(trimmed)) {
    return true;
  }
  return false;
}

function splitParagraphs(text: string): BodyParagraph[] {
  if (!text || text.trim().length === 0) return [];
  // Split on blank lines first; fall back to single-newline split for
  // sources without paragraph breaks.
  let raw = text.split(/\n\s*\n+/).map((p) => p.replace(/\s+/g, " ").trim());
  if (raw.length <= 2 && text.includes("\n")) {
    raw = text.split(/\n+/).map((p) => p.trim());
  }
  raw = raw.filter((p) => p.length > 0);

  return raw.map((para, idx) => {
    const anchor = detectAnchor(para);
    return {
      index: idx + 1,
      text: para,
      detectedAnchor: anchor,
      isHeading: looksLikeHeading(para, anchor),
    };
  });
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ===========================================================================
// On-demand source fetch
// ---------------------------------------------------------------------------
// None of the current connectors capture full page bodies — they only store
// the regulator's search-result description. When the viewer opens and a
// row has no body_text (or only a 1-line summary), the user can hit "Load
// full text from source" and we GET source_url server-side, strip HTML,
// and persist back into body_text + body_html so subsequent views are free.
//
// Hard guards:
//   - 10s fetch timeout
//   - 5MB cap on response body
//   - http(s) only
//   - User-Agent set so polite (some regulators 403 the default)
//   - body_text is updated only if extracted text is >= MIN_USEFUL_BODY chars
// ===========================================================================

const MIN_USEFUL_BODY = 400;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 5 * 1024 * 1024;

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

  // Auth gate — viewer is org-member-only via the page-level checks; this
  // action also requires an authenticated session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const svc = createServiceClient();
  const { data: row } = await svc
    .from("regulatory_items")
    .select("id, source_url, body_text, enrichment_metadata")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Regulation not found" };
  const sourceUrl = row.source_url as string | null;
  if (!sourceUrl) {
    return { ok: false, error: "No source URL on this regulation" };
  }
  if (!/^https?:\/\//i.test(sourceUrl)) {
    return { ok: false, error: "Source URL is not http(s)" };
  }

  // Fetch with timeout.
  let html = "";
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(sourceUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Many regulators 403 the default node UA. Use a real one.
        "User-Agent":
          "Mozilla/5.0 (compatible; intelle.io RegWatch/1.0; +https://intelle.io)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(t);
    if (!res.ok) {
      return {
        ok: false,
        error: `Source returned HTTP ${res.status}. Open the Source link to read it directly.`,
      };
    }
    // Cap body size — read up to MAX_BODY_BYTES then stop.
    const reader = res.body?.getReader();
    if (!reader) {
      html = await res.text();
    } else {
      const decoder = new TextDecoder();
      let received = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > MAX_BODY_BYTES) {
          reader.cancel();
          break;
        }
        html += decoder.decode(value, { stream: true });
      }
      html += decoder.decode();
    }
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") {
      return {
        ok: false,
        error: `Source page took longer than ${FETCH_TIMEOUT_MS / 1000}s to respond. It might be JS-rendered or blocking bots — use the Source link.`,
      };
    }
    return {
      ok: false,
      error: `Fetch failed: ${err.message}. Use the Source link to read it directly.`,
    };
  }

  const extracted = extractMainText(html);
  if (extracted.length < MIN_USEFUL_BODY) {
    return {
      ok: false,
      error: `Source page returned only ${extracted.length} chars of usable text — probably JS-rendered or behind a paywall. Use the Source link.`,
      extractedChars: extracted.length,
    };
  }

  const prevMetadata = (row.enrichment_metadata as Record<string, unknown>) ?? {};
  const { error: upErr } = await svc
    .from("regulatory_items")
    .update({
      body_text: extracted,
      body_html: html.length <= MAX_BODY_BYTES ? html : null,
      enrichment_metadata: {
        ...prevMetadata,
        body_fetched_at: new Date().toISOString(),
        body_fetched_chars: extracted.length,
        body_fetched_by: user.id,
      },
    })
    .eq("id", parsed.data.id);
  if (upErr) return { ok: false, error: upErr.message };

  const refreshed = await getRegulationBody({ id: parsed.data.id });
  return {
    ok: true,
    updated: true,
    extractedChars: extracted.length,
    body: refreshed ?? undefined,
  };
}

/**
 * Naive HTML → main-text extractor. Strips script / style / svg / nav /
 * header / footer / aside, then takes the remaining textual content with
 * paragraph breaks preserved at <p>, <br>, <h*>, <li>.
 *
 * Not a full Readability port — good enough for the regulator pages we
 * scrape (gov.uk, EUR-Lex, federalregister.gov, IMO, ECHA, etc.) which
 * are mostly server-rendered HTML. JS-rendered pages will fall through
 * the MIN_USEFUL_BODY gate and the user is told to use the Source link.
 */
function extractMainText(html: string): string {
  if (!html) return "";
  let s = html;

  // Strip whole tags + their content.
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  s = s.replace(/<header[\s\S]*?<\/header>/gi, " ");
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  s = s.replace(/<aside[\s\S]*?<\/aside>/gi, " ");
  s = s.replace(/<form[\s\S]*?<\/form>/gi, " ");

  // Comments.
  s = s.replace(/<!--[\s\S]*?-->/g, " ");

  // Inject paragraph breaks at block-level tags so the post-strip text
  // preserves the document structure.
  s = s.replace(/<\/(p|div|section|article|li|h[1-6]|blockquote|tr)\s*>/gi, "\n\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/td\s*>/gi, "  ");

  // Strip remaining tags.
  s = s.replace(/<[^>]+>/g, " ");

  // Decode the common HTML entities we'll see.
  s = s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10)),
    );

  // Collapse runs of whitespace, normalise newlines.
  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}
