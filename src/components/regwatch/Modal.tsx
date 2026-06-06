"use client";

import { useEffect, useRef } from "react";

/**
 * Reusable branded modal — matches the ObligationWorkflow dialog styling so
 * the whole app converges on one popup look. Centered, glassy panel, ESC
 * + backdrop-click to close.
 *
 * Use this directly for custom forms, or use PromptDialog / ConfirmDialog
 * below for one-line replacements of window.prompt / window.confirm.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
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

  // Focus first focusable element on open for keyboard accessibility.
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        "input, textarea, select, button",
      );
      first?.focus();
    }, 30);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const maxW =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div
        ref={panelRef}
        className={`w-full ${maxW} rounded-xl border border-card-border bg-background p-5 shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-card-bg hover:text-foreground"
            aria-label="Close"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  pending = false,
  danger = false,
  confirmDisabled = false,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  danger?: boolean;
  confirmDisabled?: boolean;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground hover:border-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending || confirmDisabled}
        className={`rounded-md px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
          danger
            ? "border border-red-500/40 bg-transparent text-red-300 hover:border-red-500 hover:bg-red-500/10"
            : "bg-brand-blue text-white hover:bg-brand-blue/90"
        }`}
      >
        {pending ? "Working…" : confirmLabel}
      </button>
    </div>
  );
}
