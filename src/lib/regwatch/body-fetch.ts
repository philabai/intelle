import { createServiceClient } from "@/lib/regwatch/supabase/service";

/**
 * Shared source-page fetcher used by:
 *   - The on-demand viewer action (regulation-body-actions.ts)
 *   - The /api/cron/regwatch-body-enrich bulk pass
 *
 * No "use server" pragma so callers control execution context.
 */

export const MIN_USEFUL_BODY = 400;
export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_BODY_BYTES = 5 * 1024 * 1024;

export interface FetchOneResult {
  ok: boolean;
  /** True when DB body_text was actually patched. */
  updated: boolean;
  extractedChars: number;
  error?: string;
}

/**
 * Fetch + parse + persist for one regulatory_items row. Idempotent — re-running
 * on a row that already has body_text shorter than the new fetch will overwrite
 * with the longer text; runs that come back with fewer chars than what's
 * already stored are silently no-ops.
 */
export async function fetchAndPersistRegulationBody(
  rowId: string,
  actorUserId: string | null = null,
): Promise<FetchOneResult> {
  const svc = createServiceClient();
  const { data: row } = await svc
    .from("regulatory_items")
    .select("id, source_url, body_text, enrichment_metadata")
    .eq("id", rowId)
    .maybeSingle();
  if (!row) {
    return { ok: false, updated: false, extractedChars: 0, error: "Row not found" };
  }
  const sourceUrl = row.source_url as string | null;
  if (!sourceUrl) {
    return { ok: false, updated: false, extractedChars: 0, error: "No source URL" };
  }
  if (!/^https?:\/\//i.test(sourceUrl)) {
    return {
      ok: false,
      updated: false,
      extractedChars: 0,
      error: "Source URL is not http(s)",
    };
  }

  let html = "";
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(sourceUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; intelle.io RegWatch/1.0; +https://intelle.io)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(t);
    if (!res.ok) {
      return {
        ok: false,
        updated: false,
        extractedChars: 0,
        error: `HTTP ${res.status}`,
      };
    }
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
    return {
      ok: false,
      updated: false,
      extractedChars: 0,
      error: err.name === "AbortError" ? "timeout" : err.message,
    };
  }

  const extracted = extractMainText(html);

  // Quality gate — apply the same junk filter + dedup the viewer uses, then
  // check the result. A page that strips down to mostly chrome (cookies,
  // breadcrumbs, language switchers) shouldn't get persisted; we'd rather
  // keep the regulator-summary fallback than poison body_text with junk.
  const rawParas = extracted
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);
  const cleanedParas = dedupeNearbyParagraphs(filterJunkParagraphs(rawParas));
  const cleanedText = cleanedParas.join("\n\n").trim();
  const quality = paragraphQuality(cleanedParas);
  const cleanedChars = cleanedText.length;

  const acceptable =
    cleanedChars >= MIN_USEFUL_BODY && quality >= 0.45 && cleanedParas.length >= 3;

  if (!acceptable) {
    // Stamp metadata so the cron doesn't keep retrying this row forever.
    const prevMetadata =
      (row.enrichment_metadata as Record<string, unknown>) ?? {};
    await svc
      .from("regulatory_items")
      .update({
        enrichment_metadata: {
          ...prevMetadata,
          body_fetched_at: new Date().toISOString(),
          body_fetched_chars: cleanedChars,
          body_fetched_raw_chars: extracted.length,
          body_fetched_paragraphs: cleanedParas.length,
          body_fetched_quality: Number(quality.toFixed(3)),
          body_fetch_skipped_reason:
            cleanedChars < MIN_USEFUL_BODY
              ? "thin-content-after-clean"
              : quality < 0.45
                ? "low-quality"
                : "too-few-paragraphs",
        },
      })
      .eq("id", rowId);
    return {
      ok: true,
      updated: false,
      extractedChars: cleanedChars,
      error: `Extraction failed quality bar: ${cleanedParas.length} paragraphs, quality ${quality.toFixed(2)}, ${cleanedChars} chars after clean`,
    };
  }

  // Avoid clobbering an already-richer body.
  const existing = (row.body_text as string | null) ?? "";
  if (existing.length > cleanedChars * 1.1) {
    // Stored body is meaningfully larger; treat as already-rich.
    const prevMetadata =
      (row.enrichment_metadata as Record<string, unknown>) ?? {};
    await svc
      .from("regulatory_items")
      .update({
        enrichment_metadata: {
          ...prevMetadata,
          body_fetched_at: new Date().toISOString(),
          body_fetched_chars: existing.length,
          body_fetch_skipped_reason: "existing-richer",
        },
      })
      .eq("id", rowId);
    return { ok: true, updated: false, extractedChars: existing.length };
  }

  const prevMetadata =
    (row.enrichment_metadata as Record<string, unknown>) ?? {};
  const { error: upErr } = await svc
    .from("regulatory_items")
    .update({
      body_text: cleanedText,
      body_html: html.length <= MAX_BODY_BYTES ? html : null,
      enrichment_metadata: {
        ...prevMetadata,
        body_fetched_at: new Date().toISOString(),
        body_fetched_chars: cleanedChars,
        body_fetched_raw_chars: extracted.length,
        body_fetched_paragraphs: cleanedParas.length,
        body_fetched_quality: Number(quality.toFixed(3)),
        body_fetched_by: actorUserId,
      },
    })
    .eq("id", rowId);
  if (upErr) {
    return {
      ok: false,
      updated: false,
      extractedChars: cleanedChars,
      error: upErr.message,
    };
  }
  return { ok: true, updated: true, extractedChars: cleanedChars };
}

/**
 * Two-stage HTML → main-text extractor:
 *
 *   Stage 1 (content-area selection): try to isolate the page's main content
 *     region. Many regulator templates surround the actual regulation with
 *     huge wrappers full of "skip to content", cookie banners, share
 *     buttons, year-range navigation, copyright lines, and "Last updated"
 *     stamps that pollute a naive whole-page strip. The selectors below
 *     match the common conventions (gov.uk's `id="content"`, federal-
 *     register / EUR-Lex `<article>`, generic `<main>` and `role="main"`).
 *
 *   Stage 2 (tag strip + entity decode + whitespace normalise): the part
 *     the previous version did, but applied to the smaller selected region.
 *
 * Junk-paragraph filtering is then applied at split time by
 * `filterJunkParagraphs()` — applied AT WRITE TIME (the persisted text is
 * clean) AND at read time in the viewer so already-stored junk-bodies
 * cleaner up retroactively without a re-fetch.
 */
export function extractMainText(html: string): string {
  if (!html) return "";
  const region = selectMainRegion(html);
  return stripAndNormalise(region);
}

/**
 * Returns the substring of `html` that most likely contains the actual
 * regulation body, picking from a priority list of common selectors. Falls
 * back to the whole document if nothing matches.
 */
function selectMainRegion(html: string): string {
  // Patterns are tried in order; first match wins. Each pattern captures
  // the inner content of the matched element (greedy from open to matching
  // close, accepting nested children — fine for our purposes).
  const candidates: RegExp[] = [
    // <main> / <article>
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    // role="main"
    /<[a-z]+\b[^>]*role=["']main["'][^>]*>([\s\S]*?)<\/[a-z]+>/i,
    // gov.uk + many UK gov pages use id="content"
    /<[a-z]+\b[^>]*id=["'](?:content|main-content|main|page-content)["'][^>]*>([\s\S]*?)<\/[a-z]+>/i,
    // class hints
    /<[a-z]+\b[^>]*class=["'][^"']*(?:gov-uk-content|publication-content|main-content|page-content)[^"']*["'][^>]*>([\s\S]*?)<\/[a-z]+>/i,
  ];
  for (const re of candidates) {
    const m = html.match(re);
    if (m && m[1] && m[1].length > 500) {
      return m[1];
    }
  }
  return html;
}

function stripAndNormalise(html: string): string {
  let s = html;

  // Whole-block strips for chrome that snuck into the main region.
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, " ");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  s = s.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  s = s.replace(/<header[\s\S]*?<\/header>/gi, " ");
  s = s.replace(/<footer[\s\S]*?<\/footer>/gi, " ");
  s = s.replace(/<aside[\s\S]*?<\/aside>/gi, " ");
  s = s.replace(/<form[\s\S]*?<\/form>/gi, " ");

  // Common in-page chrome: cookie/consent banners, "skip to content",
  // breadcrumbs, share-buttons, "you might also be interested" rails.
  // These match div-class attributes used across the regulator corpus.
  const CHROME_CLASS_RE =
    /<(div|section|ul|ol|nav)\b[^>]*class=["'][^"']*(?:cookie|consent|gdpr|skip-link|breadcrumb|share|sidebar|side-rail|related|further-reading|sign-?in|signup|footer|toolbar|cta|promo|newsletter|app-banner|banner-message|toc-list|nav-list|menu|dropdown|notification-bar)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi;
  s = s.replace(CHROME_CLASS_RE, " ");

  // Comments.
  s = s.replace(/<!--[\s\S]*?-->/g, " ");

  // Paragraph breaks at block-level closers so post-strip text retains shape.
  s = s.replace(
    /<\/(p|div|section|article|li|h[1-6]|blockquote|tr)\s*>/gi,
    "\n\n",
  );
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/td\s*>/gi, "  ");
  s = s.replace(/<[^>]+>/g, " ");

  s = decodeEntities(s);

  s = s.replace(/[ \t]+/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&copy;/g, "©")
    .replace(/&reg;/g, "®")
    .replace(/&trade;/g, "™")
    .replace(/&pound;/g, "£")
    .replace(/&euro;/g, "€")
    .replace(/&deg;/g, "°")
    .replace(/&middot;/g, "·")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#([0-9]+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10)),
    );
}

// ---------------------------------------------------------------------------
// Junk paragraph filtering — applied at write time AND at read time
// ---------------------------------------------------------------------------

/**
 * Drops paragraphs that are clearly not part of the regulation: bare years,
 * dates, copyright lines, cookie banners, navigation hints, sign-in
 * prompts, share buttons, "skip to content", and similar chrome that
 * survived the tag-level strip. Also drops paragraphs with no
 * alphabetic content or that are too short to be meaningful prose.
 *
 * Pure function — exported so the viewer can re-filter at read time and
 * historical thin bodies clean themselves up without a re-fetch.
 */
export function filterJunkParagraphs(paragraphs: string[]): string[] {
  return paragraphs.filter((p) => !isJunkParagraph(p));
}

const JUNK_EXACT = new Set([
  "skip to main content",
  "skip to content",
  "back to top",
  "share this",
  "share this page",
  "tweet",
  "email",
  "print",
  "facebook",
  "linkedin",
  "whatsapp",
  "menu",
  "sign in",
  "sign up",
  "log in",
  "log out",
  "home",
  "previous page",
  "next page",
  "breadcrumb",
  "search this site",
  "cookies on gov.uk",
  "we use cookies",
  "accept cookies",
  "reject cookies",
  "cookie preferences",
  "cookie settings",
  "help",
  "contact",
  "contact us",
  "privacy",
  "terms",
  "accessibility",
  "view all",
  "see all",
  "more",
  "more from",
  // EUR-Lex chrome
  "advanced search",
  "search tips",
  "expert search",
  "quick search",
  "browse by",
  "official journal",
  "html",
  "pdf",
  "english",
  "français",
  "deutsch",
  "español",
  "italiano",
  "summary",
  "text",
  "document information",
  "save to my items",
  "download",
  "permanent link",
  "languages and formats available",
]);

// 2- or 3-letter language codes used in EUR-Lex / IMO / EU regulator language
// switchers. These bleed into the body as one-line paragraphs.
const LANGUAGE_CODE_RE = /^[A-Z]{2,3}$/;

const JUNK_PREFIX_RE = /^(skip to|jump to|back to|sign in|sign up|log in|log out|menu|breadcrumb|share|tweet|print this|view all|see all|published\s+\d|last updated\s|updated\s+\d)/i;

const COPYRIGHT_RE =
  /^(©|copyright|all rights reserved|crown copyright|©\s?crown copyright|©\s?\d{4}|\(c\)\s?\d{4}|open government licence)/i;

const COOKIE_RE =
  /\b(cookies?|consent|gdpr)\b.*\b(accept|reject|set|manage|preferences|policy)\b/i;

const PAGE_NAV_RE =
  /^(page\s+\d+\s+of\s+\d+|\d+\s+of\s+\d+|first\s+previous\s+\d+|next\s+last)/i;

const BARE_YEAR_RE = /^\s*\d{4}\s*$/;
const BARE_DATE_RE =
  /^\s*\d{1,2}\s+(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?)\s+\d{4}\s*$/i;
const BARE_ISO_DATE_RE = /^\s*\d{4}-\d{2}-\d{2}\s*$/;

function isJunkParagraph(p: string): boolean {
  const trimmed = p.trim();
  if (trimmed.length === 0) return true;

  // Pure year, pure date, ISO date.
  if (BARE_YEAR_RE.test(trimmed)) return true;
  if (BARE_DATE_RE.test(trimmed)) return true;
  if (BARE_ISO_DATE_RE.test(trimmed)) return true;

  // No alphabetic content of any length.
  if (!/[a-zA-Z]{3,}/.test(trimmed)) return true;

  // Language switcher / two-or-three-letter all-caps tokens.
  if (LANGUAGE_CODE_RE.test(trimmed)) return true;

  // Exact-match chrome strings.
  if (JUNK_EXACT.has(trimmed.toLowerCase())) return true;

  // Prefix-match chrome.
  if (JUNK_PREFIX_RE.test(trimmed)) return true;

  // Copyright / licence lines.
  if (COPYRIGHT_RE.test(trimmed)) return true;

  // Cookie banners (any length; they're always junk).
  if (COOKIE_RE.test(trimmed)) return true;

  // Page navigation.
  if (PAGE_NAV_RE.test(trimmed)) return true;

  // EUR-Lex "Document 32026D0850" style chrome (Document + alphanumeric id only).
  if (/^document\s+[A-Z0-9]+\s*$/i.test(trimmed)) return true;
  // EUR-Lex Official Journal manifest line (citation + language matrix).
  if (
    /^OJ\s+[A-Z]+,?\s+\d+\/\d+,?\s+\d/.test(trimmed) &&
    /\([A-Z]{2}(?:,\s*[A-Z]{2}){2,}\)/.test(trimmed)
  ) {
    return true;
  }
  // CELEX / ELI bare-id lines.
  if (/^(celex|eli):\s*\S+$/i.test(trimmed)) return true;

  // Very short paragraphs that aren't likely sentence-form. We allow short
  // lines through ONLY when they end in punctuation OR contain at least
  // two capitalised words (multi-word title) — single capitalised words
  // are usually nav labels ("Print", "Help").
  if (trimmed.length < 40) {
    const endsInPunctuation = /[.!?:;]$/.test(trimmed);
    const multiCap =
      (trimmed.match(/\b[A-Z][a-z]{2,}/g) ?? []).length >= 2;
    const looksLikeHeadingAnchor = !!detectAnchorLite(trimmed);
    if (!endsInPunctuation && !multiCap && !looksLikeHeadingAnchor) return true;
  }

  // Long horizontal bars of digits/punctuation only ("· · ·", "→ → →").
  const alphaRatio =
    (trimmed.match(/[a-zA-Z]/g)?.length ?? 0) / trimmed.length;
  if (alphaRatio < 0.35) return true;

  return false;
}

/**
 * Light heading detector used by the junk filter — only true for our
 * structural heading patterns (Article, Section, etc.). Mirrors the
 * regex set in regulation-body-actions.ts but kept local to this module
 * so the dependency arrow stays clean.
 */
function detectAnchorLite(line: string): boolean {
  return /^(article|§|section|annex|appendix|schedule|chapter|part|title|rule|paragraph|para)\s+[0-9IVXLCDM]/i.test(
    line,
  );
}

/**
 * Drops consecutive (or near-consecutive) duplicate paragraphs. EUR-Lex
 * pages typically render the document title in the header, breadcrumb,
 * and body — without dedup the viewer shows the same paragraph three
 * times in a row.
 *
 * Strategy: collapse a normalised version (whitespace, case, punctuation
 * stripped) and skip any paragraph we've seen in the last DEDUP_WINDOW
 * non-empty entries.
 */
const DEDUP_WINDOW = 10;
export function dedupeNearbyParagraphs(paragraphs: string[]): string[] {
  const recent = new Set<string>();
  const recentOrder: string[] = [];
  const out: string[] = [];
  for (const p of paragraphs) {
    const key = p
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .slice(0, 200);
    if (!key) {
      out.push(p);
      continue;
    }
    if (recent.has(key)) continue;
    out.push(p);
    recent.add(key);
    recentOrder.push(key);
    if (recentOrder.length > DEDUP_WINDOW) {
      const dropped = recentOrder.shift();
      if (dropped) recent.delete(dropped);
    }
  }
  return out;
}

/**
 * Returns a 0..1 quality score for an extracted-paragraph set. Used by the
 * bulk cron to decide whether to persist the result. The cron treats anything
 * below 0.45 as "thin-content" and writes a skip marker so it isn't retried
 * on every tick.
 *
 * Heuristic:
 *   - 60% weighting on (kept paragraphs that look like prose) / total
 *   - 40% weighting on average alphabetic ratio of kept paragraphs
 */
export function paragraphQuality(filtered: string[]): number {
  if (filtered.length === 0) return 0;
  const proseLike = filtered.filter(
    (p) => p.length >= 80 && /[.!?]/.test(p),
  ).length;
  const proseRatio = proseLike / Math.max(filtered.length, 1);
  let alphaSum = 0;
  for (const p of filtered) {
    alphaSum += (p.match(/[a-zA-Z]/g)?.length ?? 0) / Math.max(p.length, 1);
  }
  const avgAlpha = alphaSum / filtered.length;
  return 0.6 * proseRatio + 0.4 * avgAlpha;
}

export interface BatchResult {
  considered: number;
  fetched: number;
  thin: number;
  failed: number;
  errors: string[];
  duration_ms: number;
}

/**
 * Drains a batch of enriched-but-thin-body rows. Picks rows with:
 *   - enrichment_status = 'enriched'
 *   - body_text shorter than MIN_USEFUL_BODY, or summary == body_text
 *   - body_fetched_at not yet set in enrichment_metadata
 *
 * Sequential per row with a small inter-fetch delay so we don't pile on
 * one regulator (rate-limit safety). 6 rows per cron tick keeps it under
 * a minute even with timeouts.
 */
export async function runBodyEnrichmentBatch(
  batchSize = 6,
): Promise<BatchResult> {
  const started = Date.now();
  const result: BatchResult = {
    considered: 0,
    fetched: 0,
    thin: 0,
    failed: 0,
    errors: [],
    duration_ms: 0,
  };
  const svc = createServiceClient();

  // Pick a batch. Postgres-side filter: enriched + (body_text is short OR null)
  // AND no body_fetched_at stamp yet. We can't easily express "summary == body_text"
  // in PostgREST so we just look for short bodies (< 600 chars) which catches
  // both the null and the summary-duplicated cases.
  const { data: rows, error } = await svc
    .from("regulatory_items")
    .select("id, source_url, body_text, enrichment_metadata, last_changed_at")
    .eq("enrichment_status", "enriched")
    .not("source_url", "is", null)
    .order("last_changed_at", { ascending: false })
    .limit(batchSize * 4); // pull extra so we can filter in JS
  if (error) {
    result.errors.push(`select: ${error.message}`);
    result.duration_ms = Date.now() - started;
    return result;
  }

  // Pick candidates whose body_text is short/null AND whose metadata has no
  // body_fetched_at (or had it but body_fetched_chars was thin AND last
  // attempt > 7 days ago).
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const candidates: { id: string; sourceUrl: string }[] = [];
  for (const row of rows ?? []) {
    if (candidates.length >= batchSize) break;
    const body = (row.body_text as string | null) ?? "";
    if (body.length >= 600) continue;
    const md = (row.enrichment_metadata as Record<string, unknown>) ?? {};
    const fetchedAt = md.body_fetched_at as string | undefined;
    if (fetchedAt) {
      const fetchedChars = (md.body_fetched_chars as number | undefined) ?? 0;
      const skip = (md.body_fetch_skipped_reason as string | undefined) ?? null;
      // Already-rich, already-attempted: skip.
      if (fetchedChars >= MIN_USEFUL_BODY) continue;
      // Thin + recently tried: skip for the cooldown.
      const ageMs = now - new Date(fetchedAt).getTime();
      if (ageMs < WEEK_MS) continue;
      if (skip === "existing-richer") continue;
    }
    candidates.push({
      id: row.id as string,
      sourceUrl: row.source_url as string,
    });
  }
  result.considered = candidates.length;

  for (const c of candidates) {
    const r = await fetchAndPersistRegulationBody(c.id, null);
    if (!r.ok) {
      result.failed += 1;
      if (r.error) result.errors.push(`${c.id}: ${r.error}`);
      continue;
    }
    if (r.updated) result.fetched += 1;
    else result.thin += 1;
    // Polite throttle between regulator hits.
    await new Promise((res) => setTimeout(res, 250));
  }

  result.duration_ms = Date.now() - started;
  return result;
}
