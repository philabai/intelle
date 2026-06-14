"use client";

import { useTranslations } from "next-intl";
import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor | null;
}

/**
 * Lean toolbar — formatting + structural blocks + tables. Citation insertion
 * is gated behind the Compose workspace (PR-5); the button stays here as a
 * tooltip-only hint so users find it.
 */
export function EditorToolbar({ editor }: Props) {
  const t = useTranslations("regwatch.documents");
  if (!editor) return null;

  const btn = (
    label: string,
    active: boolean,
    onClick: () => void,
    title?: string,
  ) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title ?? label}
      className={`rounded-md border px-2 py-1 text-[11px] ${
        active
          ? "border-brand-blue bg-brand-blue/15 text-foreground"
          : "border-card-border bg-card-bg text-foreground/85 hover:border-card-border/80"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-card-border bg-card-bg/30 px-3 py-2">
      {btn(
        "H1",
        editor.isActive("heading", { level: 1 }),
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      )}
      {btn(
        "H2",
        editor.isActive("heading", { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      )}
      {btn(
        "H3",
        editor.isActive("heading", { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      )}
      <Separator />
      {btn(
        "B",
        editor.isActive("bold"),
        () => editor.chain().focus().toggleBold().run(),
        t("boldTitle"),
      )}
      {btn(
        "I",
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run(),
        t("italicTitle"),
      )}
      {btn(
        "U",
        editor.isActive("underline"),
        () => editor.chain().focus().toggleUnderline().run(),
        t("underlineTitle"),
      )}
      <Separator />
      {btn(
        "• List",
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
      )}
      {btn(
        "1. List",
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
      )}
      {btn(
        "Quote",
        editor.isActive("blockquote"),
        () => editor.chain().focus().toggleBlockquote().run(),
      )}
      <Separator />
      {btn(
        "Table",
        false,
        () =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run(),
        t("insertTable"),
      )}
      {btn(
        "+ Row",
        false,
        () => editor.chain().focus().addRowAfter().run(),
        t("addRowBelow"),
      )}
      {btn(
        "+ Col",
        false,
        () => editor.chain().focus().addColumnAfter().run(),
        t("addColumnRight"),
      )}
      <Separator />
      {btn(
        "↵ Page break",
        false,
        () => editor.chain().focus().insertPageBreak().run(),
        t("insertPageBreakTitle"),
      )}
      <Separator />
      <button
        type="button"
        disabled
        title={t("citeClauseDisabledTitle")}
        className="cursor-not-allowed rounded-md border border-card-border bg-card-bg/40 px-2 py-1 text-[11px] text-muted/60"
      >
        🔗 {t("citeClause")}
      </button>
    </div>
  );
}

function Separator() {
  return <span className="mx-1 h-5 w-px bg-card-border" aria-hidden />;
}
