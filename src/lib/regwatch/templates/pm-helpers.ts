/**
 * ProseMirror JSON builders for the template registry. Templates are
 * authored declaratively as nested helper calls so the source reads like
 * an outline. Output matches the node schema used by the TipTap editor
 * (StarterKit + Link + Underline + Table + Image + cited_clause).
 *
 * Schema is locked at SCHEMA_VERSION; saves at non-current versions are
 * rejected and migrated via the read-path walker (PR-2).
 */

export const SCHEMA_VERSION = 1;

export interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  marks?: PMMark[];
  text?: string;
}

export interface PMMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface PMDoc {
  type: "doc";
  schemaVersion: number;
  content: PMNode[];
}

// ---------------------------------------------------------------------------
// Block builders
// ---------------------------------------------------------------------------

export function doc(...content: PMNode[]): PMDoc {
  return { type: "doc", schemaVersion: SCHEMA_VERSION, content };
}

export function h1(text: string): PMNode {
  if (!text) return { type: "heading", attrs: { level: 1 } };
  return { type: "heading", attrs: { level: 1 }, content: [textNode(text)] };
}

export function h2(text: string): PMNode {
  if (!text) return { type: "heading", attrs: { level: 2 } };
  return { type: "heading", attrs: { level: 2 }, content: [textNode(text)] };
}

export function h3(text: string): PMNode {
  if (!text) return { type: "heading", attrs: { level: 3 } };
  return { type: "heading", attrs: { level: 3 }, content: [textNode(text)] };
}

/**
 * Paragraph builder. Strings get wrapped in a text node; PMNodes pass
 * through. Empty strings are dropped — ProseMirror rejects empty text
 * nodes and silently throws away the entire doc otherwise (this caused
 * templates to land in the editor blank on first instantiation).
 */
export function p(...children: (PMNode | string)[]): PMNode {
  const content: PMNode[] = [];
  for (const c of children) {
    if (typeof c === "string") {
      if (c.length > 0) content.push(textNode(c));
    } else {
      content.push(c);
    }
  }
  if (content.length === 0) return { type: "paragraph" };
  return { type: "paragraph", content };
}

/** Italic placeholder text used for "fill this in" prompts in templates. */
export function prompt(text: string): PMNode {
  if (!text) return { type: "paragraph" };
  return {
    type: "paragraph",
    content: [
      {
        type: "text",
        text,
        marks: [{ type: "italic" }],
      },
    ],
  };
}

export function bullets(...items: string[]): PMNode {
  return {
    type: "bulletList",
    content: items.map((t) => ({
      type: "listItem",
      content: [p(t)],
    })),
  };
}

export function numbered(...items: string[]): PMNode {
  return {
    type: "orderedList",
    attrs: { start: 1 },
    content: items.map((t) => ({
      type: "listItem",
      content: [p(t)],
    })),
  };
}

/**
 * Two-column key/value table used for metadata blocks (Purpose / Scope /
 * Effective date / Owner etc. at the top of an SOP).
 */
export function metaTable(rows: [string, string][]): PMNode {
  return {
    type: "table",
    content: [
      ...rows.map(([key, value]) => ({
        type: "tableRow",
        content: [
          {
            type: "tableCell",
            attrs: { colspan: 1, rowspan: 1 },
            content: [p({ type: "text", text: key, marks: [{ type: "bold" }] })],
          },
          {
            type: "tableCell",
            attrs: { colspan: 1, rowspan: 1 },
            content: [p(value)],
          },
        ],
      })),
    ],
  };
}

/** RACI table builder — Responsible / Accountable / Consulted / Informed. */
export function raciTable(roles: string[]): PMNode {
  return {
    type: "table",
    content: [
      {
        type: "tableRow",
        content: ["Activity", "R", "A", "C", "I"].map((h) => ({
          type: "tableHeader",
          attrs: { colspan: 1, rowspan: 1 },
          content: [p({ type: "text", text: h, marks: [{ type: "bold" }] })],
        })),
      },
      ...roles.map(() => ({
        type: "tableRow",
        content: [" ", " ", " ", " ", " "].map(() => ({
          type: "tableCell",
          attrs: { colspan: 1, rowspan: 1 },
          content: [p(" ")],
        })),
      })),
    ],
  };
}

export function hr(): PMNode {
  return { type: "horizontalRule" };
}

/**
 * Visible page break — renders as an "End of page → Page break" marker
 * in the editor; exports to a real page break in DOCX and PDF.
 */
export function pageBreak(): PMNode {
  return { type: "pageBreak" };
}

// ---------------------------------------------------------------------------
// Inline + mark builders
// ---------------------------------------------------------------------------

function textNode(text: string): PMNode {
  return { type: "text", text };
}

export function bold(text: string): PMNode {
  return { type: "text", text: text.length > 0 ? text : " ", marks: [{ type: "bold" }] };
}

// ---------------------------------------------------------------------------
// Section helper — header + prompt paragraph + optional body
// ---------------------------------------------------------------------------

/**
 * Section helper — emits a page-break + H2 + prompt paragraph + optional
 * body nodes. The page-break sits ahead of every section's H2 so the
 * title block (H1 + metaTable) stays on page 1 and each section starts
 * on its own page.
 */
export function section(heading: string, promptText: string, ...body: PMNode[]): PMNode[] {
  return [pageBreak(), h2(heading), prompt(promptText), ...body];
}

export function subsection(heading: string, promptText: string, ...body: PMNode[]): PMNode[] {
  return [h3(heading), prompt(promptText), ...body];
}
