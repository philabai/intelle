"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TemplateGalleryDialog } from "./TemplateGalleryDialog";

interface Props {
  defaultFolderId: string | null;
}

/**
 * "+ New" CTA that opens the template gallery dialog. Lives at the top of
 * the documents page; replaces the inline CreateDocumentForm from v1.
 */
export function NewDocumentButton({ defaultFolderId }: Props) {
  const t = useTranslations("regwatch.documents");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md bg-brand-blue px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-blue/90"
        title={t("newDocumentTitle")}
      >
        <span className="text-base leading-none">+</span> {t("new")}
      </button>
      <TemplateGalleryDialog
        open={open}
        onClose={() => setOpen(false)}
        defaultFolderId={defaultFolderId}
      />
    </>
  );
}
