"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { moveDocumentToFolder } from "@/lib/regwatch/document-folders-actions";
import type { DocumentFolderTreeNode } from "@/lib/regwatch/document-folders";

interface Props {
  documentId: string;
  currentFolderId: string | null;
  folderRoots: DocumentFolderTreeNode[];
  /** Inline trigger label, e.g. "Move to…" or "Move". */
  label?: string;
}

const MENU_WIDTH = 256;
const ESTIMATED_MENU_HEIGHT = 320;

/**
 * Compact "Move to…" dropdown. The list shows Unfiled + every folder
 * flattened with a depth indent. Picking one immediately calls the
 * server action and closes the popover.
 *
 * The menu uses position:fixed with viewport-relative coordinates so the
 * parent table's `overflow-hidden` wrapper can't clip it, and flips above
 * the trigger when there isn't enough room below the viewport.
 */
export function MoveDocumentMenu({
  documentId,
  currentFolderId,
  folderRoots,
  label = "Move to…",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Close on outside click. The menu is fixed-positioned so we have to
  // check both the trigger AND the menu itself.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    if (open) window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  // Close on Escape + reposition on scroll/resize.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onReflow() {
      if (!triggerRef.current) return;
      setPos(computePos(triggerRef.current));
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    setPos(computePos(triggerRef.current));
  }, [open]);

  function move(folderId: string | null) {
    if (folderId === currentFolderId) {
      setOpen(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await moveDocumentToFolder({ documentId, folderId });
      if (!res.ok) {
        setError(res.error ?? "Could not move");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const flat = flattenFolders(folderRoots);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        title="Move this document into a project folder (or back to Unfiled)"
        className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-[10px] text-foreground hover:border-brand-blue disabled:opacity-50"
      >
        {label}
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
          className="fixed z-50 overflow-hidden rounded-md border border-card-border bg-card-bg shadow-xl"
        >
          <button
            type="button"
            onClick={() => move(null)}
            className={`block w-full px-3 py-1.5 text-start text-xs ${
              currentFolderId === null
                ? "bg-brand-teal/10 text-brand-teal"
                : "text-foreground hover:bg-brand-navy/40"
            }`}
          >
            Unfiled
          </button>
          {flat.length > 0 && (
            <div className="max-h-72 overflow-auto border-t border-card-border">
              {flat.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => move(f.id)}
                  className={`block w-full px-3 py-1.5 text-start text-xs ${
                    currentFolderId === f.id
                      ? "bg-brand-teal/10 text-brand-teal"
                      : "text-foreground hover:bg-brand-navy/40"
                  }`}
                  style={{ paddingLeft: `${12 + f.depth * 12}px` }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}
          {error && (
            <p className="border-t border-card-border bg-red-500/10 px-3 py-1.5 text-[10px] text-red-200">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function computePos(trigger: HTMLElement): { top: number; left: number } {
  const rect = trigger.getBoundingClientRect();
  const vpH = window.innerHeight;
  const vpW = window.innerWidth;
  const spaceBelow = vpH - rect.bottom;
  // Flip up when the menu would otherwise spill off the bottom.
  const openUp = spaceBelow < ESTIMATED_MENU_HEIGHT && rect.top > spaceBelow;
  const top = openUp
    ? Math.max(8, rect.top - 4 - ESTIMATED_MENU_HEIGHT)
    : rect.bottom + 4;
  // Right-align with the trigger, but keep within the viewport on narrow screens.
  const desiredLeft = rect.right - MENU_WIDTH;
  const left = Math.max(8, Math.min(desiredLeft, vpW - MENU_WIDTH - 8));
  return { top, left };
}

function flattenFolders(
  roots: DocumentFolderTreeNode[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  const out: { id: string; name: string; depth: number }[] = [];
  for (const n of roots) {
    out.push({ id: n.id, name: n.name, depth });
    if (n.children.length > 0) {
      out.push(...flattenFolders(n.children, depth + 1));
    }
  }
  return out;
}
