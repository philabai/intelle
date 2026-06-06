"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveDocumentToFolder } from "@/lib/regwatch/document-folders-actions";
import type { DocumentFolderTreeNode } from "@/lib/regwatch/document-folders";

interface Props {
  documentId: string;
  currentFolderId: string | null;
  folderRoots: DocumentFolderTreeNode[];
  /** Inline trigger label, e.g. "Move to…" or "Move". */
  label?: string;
}

/**
 * Compact "Move to…" dropdown. The list shows Unfiled + every folder
 * flattened with a depth indent. Picking one immediately calls the
 * server action and closes the popover.
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
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        title="Move this document into a project folder (or back to Unfiled)"
        className="rounded-md border border-card-border bg-card-bg px-2 py-1 text-[10px] text-foreground hover:border-brand-blue disabled:opacity-50"
      >
        {label}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-md border border-card-border bg-card-bg shadow-xl">
          <button
            type="button"
            onClick={() => move(null)}
            className={`block w-full px-3 py-1.5 text-left text-xs ${
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
                  className={`block w-full px-3 py-1.5 text-left text-xs ${
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
