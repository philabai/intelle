import {
  dedupeNearbyParagraphs,
  filterJunkParagraphs,
} from "./body-fetch";

/**
 * Pure paragraph-splitting + heading-detection used by both the regulation
 * body viewer (regulation-body-actions.ts) and the internal-document body
 * fetcher (internal-document-body-actions.ts). Pulled out of the use-server
 * module so non-async helpers can be imported.
 */

export interface BodyParagraph {
  /** Source-order index, used as a fallback anchor (e.g. "¶12"). */
  index: number;
  text: string;
  /** Detected heading anchor (e.g. "Article 6", "§ 261.4(b)(7)") when matched. */
  detectedAnchor: string | null;
  /** True when this paragraph looks like a heading (used for nav rail). */
  isHeading: boolean;
}

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

export function detectAnchor(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;
  for (const { re, format } of HEADING_PATTERNS) {
    const m = trimmed.match(re);
    if (m) return format(m);
  }
  return null;
}

export function looksLikeHeading(_line: string, anchor: string | null): boolean {
  return !!anchor;
}

export function splitParagraphs(text: string): BodyParagraph[] {
  if (!text || text.trim().length === 0) return [];
  let raw = text.split(/\n\s*\n+/).map((p) => p.replace(/\s+/g, " ").trim());
  if (raw.length <= 2 && text.includes("\n")) {
    raw = text.split(/\n+/).map((p) => p.trim());
  }
  raw = raw.filter((p) => p.length > 0);
  const cleaned = dedupeNearbyParagraphs(filterJunkParagraphs(raw));
  return cleaned.map((para, idx) => {
    const anchor = detectAnchor(para);
    return {
      index: idx + 1,
      text: para,
      detectedAnchor: anchor,
      isHeading: looksLikeHeading(para, anchor),
    };
  });
}

/**
 * Build crosswalk paragraphs directly from a TipTap/ProseMirror `body_doc`
 * (the format editor- and template-authored documents store) instead of an
 * uploaded file. Heading nodes become pickable section anchors (the doc's own
 * numbering, e.g. "1. Purpose", "5.1 Normal operation"); paragraphs, list items
 * and table rows become body paragraphs. This is what lets the clause-crosswalk
 * left pane list sections for documents that were never uploaded as a file.
 */
export function paragraphsFromProseMirror(bodyDoc: unknown): BodyParagraph[] {
  interface PMLite {
    type?: string;
    text?: string;
    content?: PMLite[];
  }
  const root = bodyDoc as PMLite | null;
  if (!root || !Array.isArray(root.content)) return [];

  const textOf = (node: PMLite): string => {
    const out: string[] = [];
    (function walk(n: PMLite | undefined) {
      if (!n) return;
      if (n.type === "text" && typeof n.text === "string") out.push(n.text);
      if (Array.isArray(n.content)) for (const c of n.content) walk(c);
    })(node);
    return out.join("").replace(/\s+/g, " ").trim();
  };

  const blocks: { text: string; isHeading: boolean }[] = [];
  const pushText = (t: string) => {
    const s = t.trim();
    if (s.length > 0) blocks.push({ text: s, isHeading: false });
  };

  for (const node of root.content) {
    switch (node.type) {
      case "heading": {
        const t = textOf(node);
        if (t) blocks.push({ text: t, isHeading: true });
        break;
      }
      case "bulletList":
      case "orderedList":
        for (const li of node.content ?? []) pushText(textOf(li));
        break;
      case "table":
        for (const row of node.content ?? []) {
          const cells = (row.content ?? []).map((c) => textOf(c)).filter(Boolean);
          if (cells.length) pushText(cells.join(" — "));
        }
        break;
      case "pageBreak":
      case "horizontalRule":
        break;
      default:
        pushText(textOf(node));
    }
  }

  return blocks.map((b, idx) => {
    const detected = b.isHeading
      ? b.text.replace(/\s+/g, " ").trim().slice(0, 100)
      : detectAnchor(b.text);
    return {
      index: idx + 1,
      text: b.text,
      detectedAnchor: detected,
      isHeading: b.isHeading || !!detected,
    };
  });
}

/**
 * Canonicalises an anchor for the mapped-already badge lookup. Lowercases,
 * collapses whitespace, drops trailing punctuation. So "Article 6" typed by
 * hand matches "Article 6" produced by `detectAnchor`.
 */
export function normaliseAnchorKey(anchor: string | null | undefined): string | null {
  if (!anchor) return null;
  const k = anchor
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/g, "")
    .trim();
  return k.length > 0 ? k : null;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
