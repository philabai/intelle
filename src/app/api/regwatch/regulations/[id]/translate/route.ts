import { NextResponse } from "next/server";
import { after } from "next/server";
import { getAnthropic } from "@/lib/anthropic/client";
import { TRANSLATION_MODEL } from "@/lib/regwatch/anthropic/models";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { getRegulationOriginalDocument } from "@/lib/regwatch/regulation-original-actions";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Background regulation-translation endpoint.
 *
 * GET  /api/regwatch/regulations/[id]/translate
 *   Status / result endpoint. Returns the cached translated text when
 *   complete, or a status code so the client can poll.
 *
 * POST /api/regwatch/regulations/[id]/translate
 *   Kicks off the translation job. Marks the row 'in_progress' and
 *   uses next/after to defer the actual extraction + Claude call so
 *   it survives the HTTP response — even if the user navigates away.
 *   Subsequent POSTs while a job is in flight are no-ops.
 *
 * Lifecycle:
 *   not_started → in_progress → completed (or failed)
 *   Stale 'in_progress' rows (>5 min, server crashed mid-job) are
 *   eligible for retry on the next POST.
 */

const STALE_AFTER_MS = 5 * 60 * 1000;

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

interface Props {
  params: Promise<{ id: string }>;
}

type StatusResponse =
  | {
      status: "completed";
      text: string;
      translatedAt: string;
      sourceLang: string;
    }
  | {
      status: "in_progress";
      startedAt: string;
      ageMs: number;
    }
  | { status: "failed"; error: string }
  | { status: "not_started" }
  | { status: "not_needed" };

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("regulatory_items")
    .select(
      "id, source_language, translated_text, translated_at, translation_status, translation_started_at, translation_error",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Regulation not found" }, { status: 404 });
  }
  const sourceLang = (data.source_language as string | null) ?? "en";
  if (sourceLang === "en") {
    return NextResponse.json({ status: "not_needed" } satisfies StatusResponse);
  }
  const status = (data.translation_status as string | null) ?? "not_started";
  if (status === "completed" && data.translated_text) {
    return NextResponse.json({
      status: "completed",
      text: data.translated_text as string,
      translatedAt: (data.translated_at as string) ?? new Date().toISOString(),
      sourceLang,
    } satisfies StatusResponse);
  }
  if (status === "in_progress") {
    const startedAt = (data.translation_started_at as string) ?? new Date().toISOString();
    return NextResponse.json({
      status: "in_progress",
      startedAt,
      ageMs: Date.now() - new Date(startedAt).getTime(),
    } satisfies StatusResponse);
  }
  if (status === "failed") {
    return NextResponse.json({
      status: "failed",
      error: (data.translation_error as string) ?? "Translation failed",
    } satisfies StatusResponse);
  }
  return NextResponse.json({ status: "not_started" } satisfies StatusResponse);
}

export async function POST(_req: Request, { params }: Props) {
  const { id } = await params;
  const svc = createServiceClient();

  const { data: row, error } = await svc
    .from("regulatory_items")
    .select(
      "id, source_language, translation_status, translation_started_at, translated_text",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !row) {
    return NextResponse.json({ error: "Regulation not found" }, { status: 404 });
  }
  const sourceLang = (row.source_language as string | null) ?? "en";
  if (sourceLang === "en") {
    return NextResponse.json({ status: "not_needed" } satisfies StatusResponse);
  }

  const status = (row.translation_status as string | null) ?? "not_started";

  // Already done — no work to start.
  if (status === "completed" && row.translated_text) {
    return NextResponse.json({ status: "completed" });
  }

  // Job in flight. If it's been running too long it crashed somewhere
  // — let this POST take it over.
  if (status === "in_progress") {
    const startedAt = row.translation_started_at
      ? new Date(row.translation_started_at as string).getTime()
      : 0;
    if (Date.now() - startedAt < STALE_AFTER_MS) {
      return NextResponse.json({ status: "in_progress" });
    }
    // Else fall through, retry.
  }

  // Mark in_progress + kick off background work.
  const startedAt = new Date().toISOString();
  await svc
    .from("regulatory_items")
    .update({
      translation_status: "in_progress",
      translation_started_at: startedAt,
      translation_error: null,
    })
    .eq("id", id);

  after(async () => {
    await runTranslation(id);
  });

  return NextResponse.json({
    status: "in_progress",
    startedAt,
    justKickedOff: true,
  });
}

async function runTranslation(regId: string): Promise<void> {
  const svc = createServiceClient();
  try {
    // 1. Pull cached PDF (or fetch + cache via the existing action).
    const original = await getRegulationOriginalDocument({ regId });
    if (!original.ok || !original.signedUrl) {
      throw new Error(
        original.error ??
          "Could not fetch the source document — translation unavailable.",
      );
    }

    // 2. Download the file.
    const res = await fetch(original.signedUrl);
    if (!res.ok) throw new Error(`Source download failed: HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();

    // 3. Extract text.
    let sourceText = "";
    if (original.mime === "application/pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
      const { text } = await extractText(pdf, { mergePages: true });
      sourceText = Array.isArray(text) ? text.join("\n") : (text ?? "");
    } else {
      const html = new TextDecoder("utf-8").decode(arrayBuffer);
      sourceText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    sourceText = sourceText.trim();
    if (sourceText.length < 50) {
      throw new Error(
        "Source document contained no extractable text. The PDF may be a scan needing OCR.",
      );
    }

    const MAX_CHARS = 60_000;
    const truncated = sourceText.length > MAX_CHARS;
    const forTranslation = truncated ? sourceText.slice(0, MAX_CHARS) : sourceText;

    // 4. Translate via Claude (single-shot; we're already running in the
    //    background so blocking here is fine).
    const anthropic = getAnthropic();
    const userMessage =
      `Source language: Arabic\nTarget language: English\n\n` +
      `--- BEGIN SOURCE DOCUMENT ---\n${forTranslation}\n--- END SOURCE DOCUMENT ---`;
    const msg = await anthropic.messages.create({
      model: TRANSLATION_MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    let translatedText = "";
    for (const block of msg.content) {
      if (block.type === "text") translatedText += block.text;
    }
    if (truncated) {
      translatedText +=
        "\n\n[Document truncated — only the first 60,000 characters were translated. The remainder is available in the Original tab.]";
    }

    // 5. Persist.
    await svc
      .from("regulatory_items")
      .update({
        translated_text: translatedText,
        translated_into: "en",
        translated_at: new Date().toISOString(),
        translation_model: TRANSLATION_MODEL,
        translation_source_chars: sourceText.length,
        translation_status: "completed",
        translation_error: null,
      })
      .eq("id", regId);
  } catch (e) {
    await svc
      .from("regulatory_items")
      .update({
        translation_status: "failed",
        translation_error: (e as Error).message,
      })
      .eq("id", regId);
  }
}
