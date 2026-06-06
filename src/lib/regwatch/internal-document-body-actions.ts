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
      return {
        ...base,
        paragraphs: [],
        extractedChars: 0,
        usableForMapping: false,
        fallbackReason: `File type "${mime || name.split(".").pop() || "unknown"}" can't be parsed for inline mapping. Type your section anchors manually below.`,
      };
    }
  } catch (e) {
    return {
      ...base,
      paragraphs: [],
      extractedChars: 0,
      usableForMapping: false,
      fallbackReason: `Text extraction failed: ${(e as Error).message}. Type your section anchors manually below.`,
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
      fallbackReason: `Only ${chars} chars across ${paragraphs.length} paragraphs survived extraction — probably a scanned PDF or image-only DOCX. Type your section anchors manually below.`,
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
