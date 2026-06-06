"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor | null;
  documentId: string;
  onApplyTemplate: () => void;
  onToggleReference: () => void;
  referenceOpen: boolean;
  onToggleOutline: () => void;
  outlineOpen: boolean;
  onToggleToolbar: () => void;
  toolbarOpen: boolean;
  onExport: (format: "docx" | "pdf") => void;
  onShowShortcuts: () => void;
  onShowWordCount: () => void;
}

type MenuKey =
  | "file"
  | "edit"
  | "view"
  | "insert"
  | "format"
  | "tools"
  | "help"
  | null;

/**
 * Google Docs-style top menu bar. Sits below the page header, above the
 * formatting toolbar. Each menu opens a dropdown with discrete commands.
 *
 * Most commands delegate to the existing editor / dialog handlers — this
 * file is the surface, not the implementation, of those actions.
 */
export function DocMenuBar({
  editor,
  documentId,
  onApplyTemplate,
  onToggleReference,
  referenceOpen,
  onToggleOutline,
  outlineOpen,
  onToggleToolbar,
  toolbarOpen,
  onExport,
  onShowShortcuts,
  onShowWordCount,
}: Props) {
  const [open, setOpen] = useState<MenuKey>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!barRef.current) return;
      if (!barRef.current.contains(e.target as Node)) setOpen(null);
    }
    if (open) window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  function run(fn: () => void) {
    fn();
    setOpen(null);
  }

  function Item({
    label,
    shortcut,
    onClick,
    disabled,
    checked,
  }: {
    label: string;
    shortcut?: string;
    onClick?: () => void;
    disabled?: boolean;
    checked?: boolean;
  }) {
    return (
      <button
        type="button"
        onClick={() => onClick && run(onClick)}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left text-xs text-foreground/95 hover:bg-brand-navy/40 disabled:cursor-not-allowed disabled:text-muted/50"
      >
        <span className="flex items-center gap-1.5">
          {checked && <span className="text-brand-teal">✓</span>}
          <span>{label}</span>
        </span>
        {shortcut && (
          <span className="font-mono text-[9px] text-muted">{shortcut}</span>
        )}
      </button>
    );
  }

  function Divider() {
    return <div className="my-1 h-px bg-card-border" />;
  }

  function MenuButton({ k, label }: { k: MenuKey; label: string }) {
    const isOpen = open === k;
    return (
      <button
        type="button"
        onMouseEnter={() => open !== null && setOpen(k)}
        onClick={() => setOpen(isOpen ? null : k)}
        className={`rounded px-2.5 py-1 text-xs ${
          isOpen
            ? "bg-card-bg text-foreground"
            : "text-foreground/85 hover:bg-card-bg/60"
        }`}
      >
        {label}
      </button>
    );
  }

  function Dropdown({ children }: { children: React.ReactNode }) {
    return (
      <div className="absolute left-0 top-full z-30 mt-0.5 min-w-56 overflow-hidden rounded-md border border-card-border bg-card-bg py-1 shadow-xl">
        {children}
      </div>
    );
  }

  return (
    <div
      ref={barRef}
      className="relative flex items-center gap-0.5 border-b border-card-border bg-card-bg/30 px-3 py-1"
    >
      {/* FILE */}
      <div className="relative">
        <MenuButton k="file" label="File" />
        {open === "file" && (
          <Dropdown>
            <Link
              href="/regwatch/documents"
              onClick={() => setOpen(null)}
              className="block px-3 py-1.5 text-xs text-foreground/95 hover:bg-brand-navy/40"
            >
              New document…
            </Link>
            <Link
              href={`/regwatch/documents/${documentId}`}
              onClick={() => setOpen(null)}
              className="block px-3 py-1.5 text-xs text-foreground/95 hover:bg-brand-navy/40"
            >
              Document details
            </Link>
            <Divider />
            <Item
              label="Save as DOCX…"
              onClick={() => onExport("docx")}
            />
            <Item label="Save as PDF…" onClick={() => onExport("pdf")} />
            <Divider />
            <Item
              label="Print"
              shortcut="⌘P"
              onClick={() => window.print()}
            />
          </Dropdown>
        )}
      </div>

      {/* EDIT */}
      <div className="relative">
        <MenuButton k="edit" label="Edit" />
        {open === "edit" && (
          <Dropdown>
            <Item
              label="Undo"
              shortcut="⌘Z"
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
            />
            <Item
              label="Redo"
              shortcut="⇧⌘Z"
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
            />
            <Divider />
            <Item
              label="Cut"
              shortcut="⌘X"
              onClick={async () => {
                if (!editor) return;
                const { from, to } = editor.state.selection;
                const slice = editor.state.doc.cut(from, to);
                await navigator.clipboard.writeText(slice.textContent);
                editor.chain().focus().deleteSelection().run();
              }}
            />
            <Item
              label="Copy"
              shortcut="⌘C"
              onClick={async () => {
                if (!editor) return;
                const { from, to } = editor.state.selection;
                await navigator.clipboard.writeText(
                  editor.state.doc.textBetween(from, to, "\n"),
                );
              }}
            />
            <Item
              label="Paste as plain text"
              shortcut="⇧⌘V"
              onClick={async () => {
                if (!editor) return;
                const text = await navigator.clipboard.readText();
                editor.chain().focus().insertContent(text).run();
              }}
            />
            <Divider />
            <Item
              label="Select all"
              shortcut="⌘A"
              onClick={() => editor?.chain().focus().selectAll().run()}
            />
          </Dropdown>
        )}
      </div>

      {/* VIEW */}
      <div className="relative">
        <MenuButton k="view" label="View" />
        {open === "view" && (
          <Dropdown>
            <Item
              label="Show outline"
              checked={outlineOpen}
              onClick={onToggleOutline}
            />
            <Item
              label="Show toolbar"
              checked={toolbarOpen}
              onClick={onToggleToolbar}
            />
            <Item
              label="Show reference pane"
              checked={referenceOpen}
              onClick={onToggleReference}
            />
          </Dropdown>
        )}
      </div>

      {/* INSERT */}
      <div className="relative">
        <MenuButton k="insert" label="Insert" />
        {open === "insert" && (
          <Dropdown>
            <Item
              label="Page break"
              shortcut="⌘↩"
              onClick={() => editor?.chain().focus().insertPageBreak().run()}
            />
            <Item
              label="Horizontal rule"
              onClick={() =>
                editor?.chain().focus().setHorizontalRule().run()
              }
            />
            <Divider />
            <Item
              label="Table (3×3)"
              onClick={() =>
                editor
                  ?.chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
            />
            <Item
              label="Add row below"
              onClick={() => editor?.chain().focus().addRowAfter().run()}
              disabled={!editor?.isActive("table")}
            />
            <Item
              label="Add column right"
              onClick={() => editor?.chain().focus().addColumnAfter().run()}
              disabled={!editor?.isActive("table")}
            />
            <Item
              label="Delete row"
              onClick={() => editor?.chain().focus().deleteRow().run()}
              disabled={!editor?.isActive("table")}
            />
            <Item
              label="Delete column"
              onClick={() => editor?.chain().focus().deleteColumn().run()}
              disabled={!editor?.isActive("table")}
            />
          </Dropdown>
        )}
      </div>

      {/* FORMAT */}
      <div className="relative">
        <MenuButton k="format" label="Format" />
        {open === "format" && (
          <Dropdown>
            <Item
              label="Bold"
              shortcut="⌘B"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              checked={editor?.isActive("bold")}
            />
            <Item
              label="Italic"
              shortcut="⌘I"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              checked={editor?.isActive("italic")}
            />
            <Item
              label="Underline"
              shortcut="⌘U"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              checked={editor?.isActive("underline")}
            />
            <Divider />
            <Item
              label="Heading 1"
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 1 }).run()
              }
              checked={editor?.isActive("heading", { level: 1 })}
            />
            <Item
              label="Heading 2"
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
              checked={editor?.isActive("heading", { level: 2 })}
            />
            <Item
              label="Heading 3"
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run()
              }
              checked={editor?.isActive("heading", { level: 3 })}
            />
            <Item
              label="Normal text"
              onClick={() => editor?.chain().focus().setParagraph().run()}
              checked={
                editor?.isActive("paragraph") &&
                !editor?.isActive("heading")
              }
            />
            <Divider />
            <Item
              label="Bullet list"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              checked={editor?.isActive("bulletList")}
            />
            <Item
              label="Numbered list"
              onClick={() =>
                editor?.chain().focus().toggleOrderedList().run()
              }
              checked={editor?.isActive("orderedList")}
            />
            <Item
              label="Block quote"
              onClick={() =>
                editor?.chain().focus().toggleBlockquote().run()
              }
              checked={editor?.isActive("blockquote")}
            />
            <Divider />
            <Item
              label="Clear formatting"
              onClick={() =>
                editor
                  ?.chain()
                  .focus()
                  .clearNodes()
                  .unsetAllMarks()
                  .run()
              }
            />
          </Dropdown>
        )}
      </div>

      {/* TOOLS */}
      <div className="relative">
        <MenuButton k="tools" label="Tools" />
        {open === "tools" && (
          <Dropdown>
            <Item label="Word count…" onClick={onShowWordCount} />
            <Divider />
            <Item label="Apply template…" onClick={onApplyTemplate} />
          </Dropdown>
        )}
      </div>

      {/* HELP */}
      <div className="relative">
        <MenuButton k="help" label="Help" />
        {open === "help" && (
          <Dropdown>
            <Item label="Keyboard shortcuts" onClick={onShowShortcuts} />
            <Divider />
            <a
              href="https://intelle.io/regwatch"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(null)}
              className="block px-3 py-1.5 text-xs text-foreground/95 hover:bg-brand-navy/40"
            >
              About RegWatch documents ↗
            </a>
          </Dropdown>
        )}
      </div>
    </div>
  );
}
