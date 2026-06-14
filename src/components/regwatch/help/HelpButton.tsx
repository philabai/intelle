"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HelpDrawer } from "./HelpDrawer";

/**
 * "?" button rendered in the top nav. Owns the HelpDrawer mount + the
 * cross-component signal to switch Iris into Help mode.
 *
 * Iris widget is mounted at the AppShell level (a sibling of Nav).
 * Communication is done via a window CustomEvent — keeps the chat
 * widget's render tree independent of the nav and avoids threading a
 * shared store for a once-per-session interaction.
 */
export function HelpButton() {
  const t = useTranslations("regwatch.help");
  const [open, setOpen] = useState(false);

  // Listen for "vantage:start-tour" events fired from other surfaces
  // (e.g. empty-state coaching that wants to launch a specific tour).
  useEffect(() => {
    function onStart() {
      setOpen(true);
    }
    window.addEventListener("vantage:open-help", onStart);
    return () => window.removeEventListener("vantage:open-help", onStart);
  }, []);

  function askIris() {
    window.dispatchEvent(new CustomEvent("vantage:iris-mode", { detail: "help" }));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t("buttonTitle")}
        aria-label={t("buttonAriaLabel")}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-card-border bg-card-bg text-sm font-semibold text-muted hover:border-brand-blue hover:text-foreground"
      >
        ?
      </button>
      <HelpDrawer open={open} onClose={() => setOpen(false)} onAskIris={askIris} />
    </>
  );
}
