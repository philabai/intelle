import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { PageBreakNode } from "./PageBreakNode";
import { CitedClauseExtension } from "./CitedClauseExtension";

/**
 * Locked v1 node set. Order matters for the TipTap schema. Any node added
 * here must be reflected in the template registry's pm-helpers.ts AND in
 * the schemaVersion handshake (the body_doc's schemaVersion field).
 *
 *   StarterKit  →  doc / paragraph / text / heading / bold / italic /
 *                  bulletList / orderedList / listItem / hardBreak /
 *                  blockquote / horizontalRule / code / codeBlock
 *   Link        →  inline link mark
 *   Underline   →  inline underline mark
 *   Placeholder →  empty-state hint
 *   Table set   →  table / tableRow / tableCell / tableHeader
 *
 * Reused on both the client editor and the server-side @tiptap/html
 * generateHTML() renderer so what the user sees while editing matches the
 * read-only render byte-for-byte.
 */
export const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Link.configure({ openOnClick: false, autolink: true }),
  Underline,
  Placeholder.configure({
    placeholder: "Type the document body — replace the prompts in italics with your real content.",
  }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  PageBreakNode,
  CitedClauseExtension,
];
