"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Drawer width; defaults to a comfortable 720px on desktop. */
  size?: "md" | "lg";
}

/**
 * Right-edge slide-over drawer. Wider than the branded `Modal` since the
 * doc workflow panels (review trail, link forms, clause crosswalk table)
 * benefit from a tall, scroll-friendly surface rather than a centered
 * card. Escape + backdrop-click both close.
 */
export function DocSlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = "lg",
}: Props) {
  const t = useTranslations("regwatch.documents");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = size === "lg" ? "max-w-[720px]" : "max-w-[520px]";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className={`fixed end-0 top-0 z-50 flex h-[100dvh] w-full ${widthClass} flex-col border-s border-card-border bg-card-bg shadow-2xl shadow-black/60`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-card-border bg-card-bg/80 px-5 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t("closeEsc")}
            className="shrink-0 rounded-md border border-card-border bg-background px-2 py-1 text-[11px] text-muted hover:border-brand-blue hover:text-foreground"
          >
            ✕ {t("close")}
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </>
  );
}
