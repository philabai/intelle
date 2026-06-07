"use server";

import { z } from "zod";
import { getAnthropic } from "@/lib/anthropic/client";
import { TRANSLATION_MODEL } from "./anthropic/models";
import { createServiceClient } from "./supabase/service";
import { getRegulationOriginalDocument } from "./regulation-original-actions";

/**
 * Regulation translation — Arabic / French / etc. → English.
 *
 * Pipeline:
 *   1. Load row, decide if a cached translation is still fresh.
 *   2. If not, fetch the cached Original PDF via the existing
 *      getRegulationOriginalDocument action (downloads + caches the
 *      publisher's source on first hit).
 *   3. Extract text with unpdf (already in deps from the
 *      internal-docs work).
 *   4. Translate via Claude Sonnet with a regulation-aware system
 *      prompt that preserves clause structure and technical terms.
 *   5. Persist translated_text + stamp the translated_at / model
 *      columns so subsequent loads are instant.
 *
 * Refetch when the regulation's last_changed_at advances past
 * translated_at — same staleness rule as the Original tab.
 */

const SUPPORTED_TARGETS = ["en"] as const;
type TargetLang = (typeof SUPPORTED_TARGETS)[number];

const inputSchema = z.object({
  regId: z.string().uuid(),
  targetLang: z.enum(SUPPORTED_TARGETS).optional(),
});

export interface TranslationResult {
  ok: boolean;
  error?: string;
  translatedText?: string;
  sourceLang?: string;
  targetLang?: TargetLang;
  translatedAt?: string;
  fromCache?: boolean;
  /** When the source is already English, no translation is needed. */
  notNeeded?: boolean;
}

const SYSTEM_PROMPT = `You are a sworn translator of technical and regulatory documents from Arabic (and other source languages) into English, for compliance officers, EHS engineers, and legal teams.

TRANSLATION RULES:
1. Translate FAITHFULLY — preserve every clause, sub-clause, number, threshold, date, citation, and reference. Do not summarise or paraphrase.
2. Preserve the document's structure: article numbers, headings, lists, tables, footnotes. Use plain text headings (## for major sections, ### for sub-sections, plain numbered list for clauses).
3. Translate technical and regulatory terms with industry-standard English equivalents (e.g. "اللائحة الفنية" → "Technical Regulation"; "متطلبات السلامة" → "Safety Requirements"; "علامة الجودة" → "Quality Mark").
4. When the source uses a Saudi/GCC-specific term that has no clean English equivalent (e.g. specific certification programmes), keep the original Arabic in parentheses after the English rendering on first occurrence: "Saudi Quality Mark (علامة الجودة السعودية)".
5. Numbers stay as digits, dates stay in their original calendar with a Gregorian conversion in brackets when Hijri is given.
6. Do not add interpretation, commentary, or modernise terminology. Translate what's there.
7. If a passage is unclear in the source (OCR artifacts, scanning errors), mark it with "[unclear in source]" rather than guessing.
8. Output plain prose. No markdown code fences. No HTML. Do not wrap the output in any preamble like "Here is the translation:".`;

export async function getRegulationTranslation(
  input: unknown,
): Promise<TranslationResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const targetLang: TargetLang = parsed.data.targetLang ?? "en";

  const svc = createServiceClient();
  const { data: row, error: loadErr } = await svc
    .from("regulatory_items")
    .select(
      "id, source_language, last_changed_at, translated_text, translated_into, translated_at, translation_model",
    )
    .eq("id", parsed.data.regId)
    .maybeSingle();
  if (loadErr || !row) {
    return { ok: false, error: loadErr?.message ?? "Regulation not found" };
  }

  const sourceLang = (row.source_language as string | null) ?? "en";
  if (sourceLang === targetLang) {
    return { ok: true, notNeeded: true, sourceLang, targetLang };
  }

  // Cache hit if (a) text exists, (b) into matches target, (c) cache
  // is still fresh relative to the regulation's last change.
  const cachedFresh =
    !!row.translated_text &&
    row.translated_into === targetLang &&
    (!row.last_changed_at ||
      !row.translated_at ||
      new Date(row.translated_at as string).getTime() >=
        new Date(row.last_changed_at as string).getTime());

  if (cachedFresh) {
    return {
      ok: true,
      translatedText: row.translated_text as string,
      sourceLang,
      targetLang,
      translatedAt: row.translated_at as string,
      fromCache: true,
    };
  }

  // Step 1: pull the original PDF / HTML via the existing cache.
  const original = await getRegulationOriginalDocument({ regId: parsed.data.regId });
  if (!original.ok || !original.signedUrl) {
    return {
      ok: false,
      error:
        original.error ??
        "Could not fetch the source document — translation unavailable.",
    };
  }

  // Step 2: download the cached file (Storage signed URL).
  let arrayBuffer: ArrayBuffer;
  try {
    const res = await fetch(original.signedUrl);
    if (!res.ok) {
      return {
        ok: false,
        error: `Source download failed: HTTP ${res.status}`,
      };
    }
    arrayBuffer = await res.arrayBuffer();
  } catch (e) {
    return { ok: false, error: `Source download failed: ${(e as Error).message}` };
  }

  // Step 3: extract text. unpdf for PDF, otherwise treat as HTML/text.
  let sourceText = "";
  try {
    if (original.mime === "application/pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
      const { text } = await extractText(pdf, { mergePages: true });
      sourceText = Array.isArray(text) ? text.join("\n") : (text ?? "");
    } else {
      // Strip HTML tags crudely; full sanitisation isn't needed here
      // because we're only feeding text to the translator.
      const html = new TextDecoder("utf-8").decode(arrayBuffer);
      sourceText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
  } catch (e) {
    return {
      ok: false,
      error: `Source text extraction failed: ${(e as Error).message}`,
    };
  }

  sourceText = sourceText.trim();
  if (sourceText.length < 50) {
    return {
      ok: false,
      error:
        "Source document contained no extractable text. The PDF may be a scan that needs OCR — translation isn't possible until that's added.",
    };
  }

  // Cap source size to keep one translation under model context.
  // Sonnet handles ~180k input tokens — at ~3 chars/token for Arabic
  // that's ~540k chars. Cap at 60k for a single shot to leave headroom
  // for output (~3:1 expansion ratio possible for Arabic → English).
  const MAX_CHARS = 60_000;
  const truncated = sourceText.length > MAX_CHARS;
  const sourceForTranslation = truncated
    ? sourceText.slice(0, MAX_CHARS)
    : sourceText;

  // Step 4: translate.
  let translatedText = "";
  try {
    const anthropic = getAnthropic();
    const userMessage =
      `Source language: ${sourceLang === "ar" ? "Arabic" : sourceLang}\n` +
      `Target language: English\n\n` +
      `--- BEGIN SOURCE DOCUMENT ---\n${sourceForTranslation}\n--- END SOURCE DOCUMENT ---`;
    const msg = await anthropic.messages.create({
      model: TRANSLATION_MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    for (const block of msg.content) {
      if (block.type === "text") translatedText += block.text;
    }
    if (truncated) {
      translatedText +=
        "\n\n[Document truncated — only the first 60,000 characters were translated. The remainder is available in the Original tab.]";
    }
  } catch (e) {
    return { ok: false, error: `Translation call failed: ${(e as Error).message}` };
  }

  // Step 5: persist the cache.
  const nowIso = new Date().toISOString();
  await svc
    .from("regulatory_items")
    .update({
      translated_text: translatedText,
      translated_into: targetLang,
      translated_at: nowIso,
      translation_model: TRANSLATION_MODEL,
      translation_source_chars: sourceText.length,
    })
    .eq("id", parsed.data.regId);

  return {
    ok: true,
    translatedText,
    sourceLang,
    targetLang,
    translatedAt: nowIso,
    fromCache: false,
  };
}
