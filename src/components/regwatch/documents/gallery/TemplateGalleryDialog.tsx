"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/regwatch/Modal";
import { createDocumentFromTemplate } from "@/lib/regwatch/internal-document-revision-actions";
import { createDocument } from "@/lib/regwatch/internal-documents-actions";
import { TEMPLATE_REGISTRY } from "@/lib/regwatch/templates/registry";
import {
  TEMPLATE_FAMILY_LABEL,
  type TemplateFamily,
} from "@/lib/regwatch/templates/types";
import { TemplatePreviewPane } from "./TemplatePreviewPane";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultFolderId: string | null;
}

const FAMILIES: TemplateFamily[] = [
  "osha-psm",
  "iso-9001",
  "21-cfr-820",
  "nasa-llis",
  "ieee-829",
  "generic",
];

/**
 * Three-pane template picker. Left rail = family tabs; middle = template
 * list within the active family; right = preview of the selected template
 * + title input + Create button.
 */
export function TemplateGalleryDialog({
  open,
  onClose,
  defaultFolderId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeFamily, setActiveFamily] = useState<TemplateFamily>("osha-psm");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const templatesInFamily = useMemo(
    () =>
      TEMPLATE_REGISTRY.filter((t) => t.family === activeFamily).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    [activeFamily],
  );

  const selected = useMemo(
    () =>
      selectedKey
        ? TEMPLATE_REGISTRY.find((t) => t.key === selectedKey) ?? null
        : null,
    [selectedKey],
  );

  function pickFamily(f: TemplateFamily) {
    setActiveFamily(f);
    setSelectedKey(null);
    setError(null);
  }

  function pickTemplate(key: string) {
    setSelectedKey(key);
    setError(null);
    const t = TEMPLATE_REGISTRY.find((x) => x.key === key);
    if (t && !title.trim()) {
      // Suggest a sensible default title from the template label.
      setTitle(t.label.replace(/^[^—]+—\s*/, ""));
    }
  }

  function onCreate(asBlank: boolean) {
    setError(null);
    if (!title.trim()) {
      setError("Give the document a title first.");
      return;
    }
    if (!asBlank && !selected) {
      setError("Pick a template, or use 'Blank document' instead.");
      return;
    }
    startTransition(async () => {
      if (asBlank) {
        const res = await createDocument({
          title: title.trim(),
          docKind: "other",
          folderId: defaultFolderId ?? null,
        });
        if (!res.ok || !res.id) {
          setError(res.error ?? "Could not create document");
          return;
        }
        onClose();
        router.push(`/regwatch/documents/${res.id}/edit`);
        return;
      }
      const res = await createDocumentFromTemplate({
        templateKey: selected!.key,
        title: title.trim(),
        folderId: defaultFolderId ?? null,
      });
      if (!res.ok || !res.id) {
        setError(res.error ?? "Could not create document from template");
        return;
      }
      onClose();
      router.push(`/regwatch/documents/${res.id}/edit`);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="New document" size="lg">
      <div className="grid h-[70vh] grid-cols-[160px_220px_1fr] gap-3">
        {/* Family rail */}
        <nav className="overflow-y-auto rounded-md border border-card-border bg-card-bg/30 p-1">
          {FAMILIES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => pickFamily(f)}
              className={`block w-full rounded-md px-2.5 py-1.5 text-left text-[11px] ${
                activeFamily === f
                  ? "bg-brand-blue/15 text-foreground"
                  : "text-muted hover:bg-card-bg/60 hover:text-foreground"
              }`}
            >
              {TEMPLATE_FAMILY_LABEL[f]}
            </button>
          ))}
        </nav>

        {/* Template list */}
        <div className="overflow-y-auto rounded-md border border-card-border bg-card-bg/20 p-1">
          {templatesInFamily.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => pickTemplate(t.key)}
              className={`block w-full rounded-md p-2 text-left ${
                selectedKey === t.key
                  ? "bg-brand-blue/15"
                  : "hover:bg-card-bg/60"
              }`}
            >
              <p className="text-xs font-medium text-foreground">{t.label}</p>
              <p className="mt-0.5 line-clamp-2 text-[10px] text-muted">
                {t.description}
              </p>
            </button>
          ))}
        </div>

        {/* Preview + create */}
        <div className="flex min-h-0 flex-col gap-3">
          {selected ? (
            <>
              <div className="rounded-md border border-card-border bg-card-bg/30 p-3">
                <p className="text-sm font-semibold text-foreground">
                  {selected.label}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {selected.description}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <TemplatePreviewPane bodyDoc={selected.prosemirrorJson} />
              </div>
              <div className="space-y-2 rounded-md border border-card-border bg-card-bg/30 p-3">
                <label className="block">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                    Document title
                  </span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Wellhead Operating Procedure — Unit 3"
                    className="mt-1 w-full rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
                  />
                </label>
                {error && (
                  <p className="text-[11px] text-red-300">{error}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onCreate(true)}
                    disabled={pending}
                    className="rounded-md border border-card-border bg-background px-3 py-1.5 text-[11px] text-muted hover:text-foreground disabled:opacity-50"
                    title="Skip the template and create an empty document"
                  >
                    Create blank instead
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreate(false)}
                    disabled={pending || !title.trim()}
                    className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50"
                  >
                    {pending ? "Creating…" : "Create from template"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-card-border bg-card-bg/20 p-6 text-center text-xs text-muted">
              Pick a template from the list to preview its structure here.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
