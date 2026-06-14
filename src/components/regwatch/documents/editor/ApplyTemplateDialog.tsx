"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/regwatch/Modal";
import { TEMPLATE_REGISTRY } from "@/lib/regwatch/templates/registry";
import {
  TEMPLATE_FAMILY_LABEL,
  type TemplateFamily,
} from "@/lib/regwatch/templates/types";

interface Props {
  open: boolean;
  onClose: () => void;
  hasExistingContent: boolean;
  onApply: (bodyDoc: unknown, templateLabel: string) => void;
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
 * In-editor template applier. Lets the author drop a template's section
 * scaffolding into the current document — useful when the doc was created
 * blank, or when the structure was accidentally cleared, or when the
 * author wants to switch templates mid-draft.
 *
 *   - If the doc already has content, we confirm before replacing.
 *   - We always REPLACE the body (not insert) so the structure is canonical.
 *     Authors who want to keep their old content should copy it elsewhere
 *     first; we surface this clearly in the confirm step.
 */
export function ApplyTemplateDialog({
  open,
  onClose,
  hasExistingContent,
  onApply,
}: Props) {
  const t = useTranslations("regwatch.documents");
  const [activeFamily, setActiveFamily] = useState<TemplateFamily>("osha-psm");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

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
    setConfirming(false);
  }

  function handleApply() {
    if (!selected) return;
    if (hasExistingContent && !confirming) {
      setConfirming(true);
      return;
    }
    onApply(selected.prosemirrorJson, selected.label);
    setSelectedKey(null);
    setConfirming(false);
  }

  function handleClose() {
    setSelectedKey(null);
    setConfirming(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("applyTemplateStructure")} size="lg">
      <div className="grid h-[60vh] grid-cols-[160px_1fr] gap-3">
        <nav className="overflow-y-auto rounded-md border border-card-border bg-card-bg/30 p-1">
          {FAMILIES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => pickFamily(f)}
              className={`block w-full rounded-md px-2.5 py-1.5 text-start text-[11px] ${
                activeFamily === f
                  ? "bg-brand-blue/15 text-foreground"
                  : "text-muted hover:bg-card-bg/60 hover:text-foreground"
              }`}
            >
              {TEMPLATE_FAMILY_LABEL[f]}
            </button>
          ))}
        </nav>

        <div className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-card-border bg-card-bg/20 p-1">
            {templatesInFamily.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setSelectedKey(t.key);
                  setConfirming(false);
                }}
                className={`block w-full rounded-md p-2 text-start ${
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

          {selected && (
            <div className="space-y-2 rounded-md border border-card-border bg-card-bg/30 p-3">
              {confirming && hasExistingContent ? (
                <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-200">
                  {t.rich("applyTemplateConfirm", {
                    label: selected.label,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </p>
              ) : (
                <p className="text-[11px] text-muted">
                  {t.rich("applyTemplateInfo", {
                    label: selected.label,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}{" "}
                  {hasExistingContent ? t("applyTemplateReplaceNote") : ""}
                </p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md border border-card-border bg-background px-3 py-1.5 text-[11px] text-muted hover:text-foreground"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90"
                >
                  {confirming && hasExistingContent
                    ? t("yesReplaceContent")
                    : t("applyTemplate")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
