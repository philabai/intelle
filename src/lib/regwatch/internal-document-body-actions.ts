"use server";

import { z } from "zod";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { splitParagraphs, type BodyParagraph } from "./paragraph-split";

export type { BodyParagraph } from "./paragraph-split";

/**
 * Loads an internal document's text body for the side-by-side clause
 * crosswalk workspace. Mirrors `getRegulationBody` from regulation-body-
 * actions.ts on the regulation side — same `BodyParagraph[]` shape so the
 * workspace renders both panes with the same component.
 *
 * Extraction route follows the evidence-analysis.ts pattern:
 *   - PDF  → pdf-parse
 *   - DOCX → mammoth.extractRawText
 *   - TXT / .md → UTF-8 decode
 *
 * `usableForMapping` is false when extraction returned thin / junk content
 * (scanned PDFs, image-only DOCX); the workspace then swaps the left pane
 * into free-text-anchor mode so the workflow still works.
 */

export interface InternalDocBody {
  id: string;
  title: string;
  fileName: string | null;
  mimeType: string | null;
  /** Same shape as regulation paragraphs — workspace renders both panes identically. */
  paragraphs: BodyParagraph[];
  /** Chars after splitParagraphs's junk-filter + dedup pass. */
  extractedChars: number;
  /** False when the doc is unparseable or thin — workspace falls back to free-text. */
  usableForMapping: boolean;
  /** Human-readable reason when usableForMapping = false. */
  fallbackReason: string | null;
}

const MIN_USEFUL_CHARS = 200;
const MIN_USEFUL_PARAGRAPHS = 3;
const MAX_EXTRACT_CHARS = 400_000;

const inputSchema = z.object({ id: z.string().uuid() });

export async function getInternalDocumentBody(
  input: unknown,
): Promise<InternalDocBody | null> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: doc, error } = await supabase
    .from("internal_documents")
    .select("id, title, file_path, file_name, mime_type")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (error || !doc) return null;

  const base = {
    id: doc.id as string,
    title: doc.title as string,
    fileName: (doc.file_name as string | null) ?? null,
    mimeType: (doc.mime_type as string | null) ?? null,
  };

  const filePath = (doc.file_path as string | null) ?? null;
  if (!filePath) {
    return {
      ...base,
      paragraphs: [],
      extractedChars: 0,
      usableForMapping: false,
      fallbackReason:
        "No file uploaded for this document yet — type the section anchors manually below.",
    };
  }

  const svc = createServiceClient();
  const { data: blob, error: dlErr } = await svc.storage
    .from("regwatch-documents")
    .download(filePath);
  if (dlErr || !blob) {
    return {
      ...base,
      paragraphs: [],
      extractedChars: 0,
      usableForMapping: false,
      fallbackReason: `Could not download the file from storage: ${dlErr?.message ?? "unknown error"}.`,
    };
  }

  const mime = (base.mimeType ?? "").toLowerCase();
  const name = (base.fileName ?? "").toLowerCase();
  const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
  const isDocx =
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx");
  const isText =
    mime.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md");

  let extracted = "";
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    if (isPdf) {
      const pdfParseMod: unknown = await import("pdf-parse");
      const pdfParse = ((pdfParseMod as { default?: unknown }).default ??
        pdfParseMod) as (b: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(buf);
      extracted = parsed.text ?? "";
    } else if (isDocx) {
      const mammoth = await import("mammoth");
      const parsed = await mammoth.extractRawText({ buffer: buf });
      extracted = parsed.value ?? "";
    } else if (isText) {
      extracted = buf.toString("utf8");
    } else {
      const ext = name.split(".").pop()?.toUpperCase() ?? "unknown";
      return {
        ...base,
        paragraphs: [],
        extractedChars: 0,
        usableForMapping: false,
        fallbackReason: `This file format (${ext}) isn't supported for automatic section detection — we can read PDF, DOCX and plain-text files. The mapping still works: type your section anchors below and pick the regulation clauses on the right.`,
      };
    }
  } catch (e) {
    // Log the technical error server-side so the cause is debuggable,
    // but show the user a friendly explanation — most authors have no
    // context for "DOMMatrix is not defined" or similar pdfjs errors.
    console.error("[getInternalDocumentBody] text extraction failed:", e);
    const isScanned = isPdf;
    return {
      ...base,
      paragraphs: [],
      extractedChars: 0,
      usableForMapping: false,
      fallbackReason: isScanned
        ? "We couldn't read the text inside this PDF — it may be a scanned or image-based file, or use an unusual font encoding. The mapping still works: type your section anchors below and pick the regulation clauses on the right."
        : "We couldn't read the text inside this file automatically — the format may be unusual or password-protected. The mapping still works: type your section anchors below and pick the regulation clauses on the right.",
    };
  }

  if (extracted.length > MAX_EXTRACT_CHARS) {
    extracted = extracted.slice(0, MAX_EXTRACT_CHARS);
  }

  const paragraphs = splitParagraphs(extracted);
  const chars = paragraphs.reduce((n, p) => n + p.text.length, 0);

  if (chars < MIN_USEFUL_CHARS || paragraphs.length < MIN_USEFUL_PARAGRAPHS) {
    return {
      ...base,
      paragraphs,
      extractedChars: chars,
      usableForMapping: false,
      fallbackReason: `The text we could read from this file is too thin to auto-list sections (only ${chars} characters across ${paragraphs.length} paragraphs) — likely a scanned PDF or image-heavy DOCX. The mapping still works: type your section anchors below and pick the regulation clauses on the right.`,
    };
  }

  return {
    ...base,
    paragraphs,
    extractedChars: chars,
    usableForMapping: true,
    fallbackReason: null,
  };
}
