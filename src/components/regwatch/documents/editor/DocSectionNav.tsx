"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";

interface Heading {
  level: 1 | 2 | 3;
  text: string;
  pos: number;
}

interface Props {
  editor: Editor | null;
  onClose: () => void;
}

/**
 * Left section / outline navigator. Auto-extracts every H1 / H2 / H3 from
 * the editor's document, lists them in source order with depth-based
 * indent, and scrolls the picked heading into view on click.
 *
 * Re-extracts on every editor transaction so it stays in sync as the
 * author types, applies templates, or pastes content.
 */
export function DocSectionNav({ editor, onClose }: Props) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activePos, setActivePos] = useState<number | null>(null);

  useEffect(() => {
    if (!editor) return;
    function extract() {
      if (!editor) return;
      const list: Heading[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "heading") {
          const level = (node.attrs.level as number) ?? 1;
          if (level >= 1 && level <= 3) {
            list.push({
              level: level as 1 | 2 | 3,
              text: node.textContent.trim() || "(untitled)",
              pos,
            });
          }
        }
        return true;
      });
      setHeadings(list);
    }
    extract();
    editor.on("update", extract);
    return () => {
      editor.off("update", extract);
    };
  }, [editor]);

  function scrollTo(h: Heading) {
    if (!editor) return;
    setActivePos(h.pos);
    try {
      const dom = editor.view.domAtPos(h.pos + 1);
      const node = dom.node as HTMLElement | Node;
      const el =
        node.nodeType === 1
          ? (node as HTMLElement)
          : ((node as Node).parentElement ?? null);
      if (el && "scrollIntoView" in el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch {
      // domAtPos can throw briefly while ProseMirror is reconciling.
    }
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-e border-card-border bg-card-bg/20">
      <div className="flex items-center justify-between gap-2 border-b border-card-border bg-card-bg/40 px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
          Outline
        </p>
        <button
          type="button"
          onClick={onClose}
          title="Hide outline (toggle via View ▾ → Show outline)"
          className="rounded-md border border-card-border bg-background px-1.5 py-0.5 text-[9px] text-muted hover:border-brand-blue hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {headings.length === 0 ? (
          <p className="px-3 py-2 text-[11px] leading-relaxed text-muted">
            Headings (H1 / H2 / H3) in your document will appear here for
            quick navigation. Add a heading via{" "}
            <strong className="text-foreground">Format ▾ → Heading 1</strong>{" "}
            or the H1 / H2 / H3 buttons in the toolbar.
          </p>
        ) : (
          <ol className="space-y-0.5">
            {headings.map((h, i) => {
              const isActive = activePos === h.pos;
              const indent =
                h.level === 1 ? "ps-3" : h.level === 2 ? "ps-6" : "ps-9";
              const size =
                h.level === 1
                  ? "text-[12px] font-medium"
                  : h.level === 2
                    ? "text-[11px]"
                    : "text-[10px]";
              return (
                <li key={`${h.pos}-${i}`}>
                  <button
                    type="button"
                    onClick={() => scrollTo(h)}
                    title={h.text}
                    className={`block w-full truncate ${indent} pe-3 py-1 text-start ${size} ${
                      isActive
                        ? "border-s-2 border-brand-teal bg-brand-teal/10 text-brand-teal"
                        : "border-s-2 border-transparent text-foreground/80 hover:bg-card-bg/60 hover:text-foreground"
                    }`}
                  >
                    {h.text}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
