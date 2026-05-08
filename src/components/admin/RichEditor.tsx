"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import { markdownToHtml, htmlToMarkdown } from "@/lib/markdown";

type Props = {
  /** Markdown source. The editor converts it to HTML on load and back to markdown on each change. */
  value: string;
  onChange: (markdown: string) => void;
};

const baseClasses =
  "min-h-[400px] max-h-[70vh] overflow-y-auto rounded-lg border border-card-border bg-background p-5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand-blue prose prose-sm prose-invert max-w-none";

export function RichEditor({ value, onChange }: Props) {
  const [showSource, setShowSource] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Article body — paste markdown or write here…",
      }),
    ],
    content: markdownToHtml(value || ""),
    immediatelyRender: false,
    editorProps: {
      attributes: { class: baseClasses },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChangeRef.current(htmlToMarkdown(html));
    },
  });

  // If the parent updates the value externally (e.g. on initial async load),
  // sync it into the editor — but only when the new value differs from what the
  // editor would emit, so we don't fight the user's typing.
  useEffect(() => {
    if (!editor) return;
    const current = htmlToMarkdown(editor.getHTML()).trim();
    const next = (value || "").trim();
    if (current !== next) {
      editor.commands.setContent(markdownToHtml(value || ""), { emitUpdate: false });
    }
    // We deliberately don't include `editor` in the deps because TipTap recreates
    // editor instances and we only want to sync on external value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) {
    return (
      <div className={baseClasses + " animate-pulse"}>Loading editor…</div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 mb-2 text-xs">
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          onClick={() => {
            const url = prompt("Link URL");
            if (!url) return;
            editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          🔗
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()}>
          ⛓
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>↶</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>↷</ToolbarButton>
        <div className="ml-auto">
          <ToolbarButton
            active={showSource}
            onClick={() => setShowSource((s) => !s)}
          >
            {showSource ? "Visual" : "Source"}
          </ToolbarButton>
        </div>
      </div>

      {showSource ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={20}
          className="w-full rounded-lg border border-card-border bg-background px-4 py-3 text-xs text-foreground font-mono focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
      ) : (
        <EditorContent editor={editor} />
      )}
      <p className="text-xs text-muted/60 mt-2">
        Diagrams are written as fenced code blocks (e.g. <code className="text-foreground">```diagram-comparison</code>).
        Edit them in <strong>Source</strong> view; they appear as code blocks in Visual view.
      </p>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[28px] h-7 px-2 rounded border text-xs cursor-pointer transition-colors ${
        active
          ? "border-brand-blue bg-brand-blue/15 text-brand-blue"
          : "border-card-border bg-background hover:border-brand-blue/50 text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-card-border mx-1" />;
}
