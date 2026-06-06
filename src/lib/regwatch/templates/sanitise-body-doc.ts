/**
 * Defensive PM JSON sanitiser. Strips any invariant violations that
 * would cause ProseMirror's `Node.fromJSON` to throw (and TipTap to
 * silently drop the entire doc), so an editor mount never lands empty
 * because of one bad node.
 *
 * Currently fixes:
 *   - Empty text nodes (`{type:"text", text:""}`) — ProseMirror rejects
 *     these outright. We just drop them.
 *
 * Idempotent — safe to call on already-clean docs.
 */

export interface PMLike {
  type?: string;
  content?: unknown[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: unknown[];
  [key: string]: unknown;
}

export function sanitiseBodyDoc(bodyDoc: unknown): unknown {
  if (!bodyDoc || typeof bodyDoc !== "object") return bodyDoc;
  return sanitiseNode(bodyDoc as PMLike);
}

function sanitiseNode(node: PMLike): PMLike | null {
  // Text nodes — drop if empty.
  if (node.type === "text") {
    if (typeof node.text !== "string" || node.text.length === 0) return null;
    return node;
  }
  // Recurse into content.
  if (Array.isArray(node.content)) {
    const cleaned: PMLike[] = [];
    for (const child of node.content) {
      if (!child || typeof child !== "object") continue;
      const c = sanitiseNode(child as PMLike);
      if (c) cleaned.push(c);
    }
    if (cleaned.length === 0) {
      // For block nodes that allow empty content (paragraph, heading, etc.)
      // we drop the content array entirely. For container nodes that
      // require content (doc, list items, table cells), we leave them
      // empty — ProseMirror handles those via its schema fillers.
      const next = { ...node };
      delete next.content;
      return next;
    }
    return { ...node, content: cleaned };
  }
  return node;
}
