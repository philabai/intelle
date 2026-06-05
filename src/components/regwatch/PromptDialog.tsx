"use client";

import { useState, useEffect, useRef } from "react";
import { Modal, ModalActions } from "./Modal";

/**
 * Branded drop-in replacements for window.prompt / window.confirm. Render
 * one of these once per consumer component and drive it with state.
 *
 * Hook-style usage so existing code paths can swap cleanly:
 *   const { ask: askName, dialog: nameDialog } = usePromptDialog();
 *   ...
 *   const name = await askName({ title: "New folder name", defaultValue: "" });
 *   if (!name) return;
 *   ...
 *   return <> ...{nameDialog} </>;
 */

interface PromptOptions {
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  /** Set true for a multi-line textarea (for longer text inputs). */
  multiline?: boolean;
  /** Block submission until non-empty. Default true. */
  required?: boolean;
}

interface PromptResolverState {
  options: PromptOptions;
  resolve: (value: string | null) => void;
}

export function usePromptDialog(): {
  ask: (opts: PromptOptions) => Promise<string | null>;
  dialog: React.ReactNode;
} {
  const [state, setState] = useState<PromptResolverState | null>(null);
  const [value, setValue] = useState("");
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (state) setValue(state.options.defaultValue ?? "");
  }, [state]);

  function ask(options: PromptOptions): Promise<string | null> {
    return new Promise((resolve) => {
      setState({ options, resolve });
    });
  }

  function close(result: string | null) {
    const current = stateRef.current;
    if (current) current.resolve(result);
    setState(null);
    setValue("");
  }

  function onConfirm() {
    const trimmed = value.trim();
    const opts = state?.options;
    if (opts?.required !== false && trimmed.length === 0) return;
    close(trimmed);
  }

  const dialog = state ? (
    <Modal
      open
      onClose={() => close(null)}
      title={state.options.title}
      size="sm"
    >
      {state.options.description && (
        <p className="mb-3 text-xs text-muted">{state.options.description}</p>
      )}
      {state.options.multiline ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={state.options.placeholder}
          rows={4}
          className="w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onConfirm();
            }
          }}
          placeholder={state.options.placeholder}
          className="w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
      )}
      <ModalActions
        onCancel={() => close(null)}
        onConfirm={onConfirm}
        confirmLabel={state.options.confirmLabel ?? "OK"}
        confirmDisabled={
          state.options.required !== false && value.trim().length === 0
        }
      />
    </Modal>
  ) : null;

  return { ask, dialog };
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in danger style (red border, transparent). */
  danger?: boolean;
}

interface ConfirmResolverState {
  options: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

export function useConfirmDialog(): {
  ask: (opts: ConfirmOptions) => Promise<boolean>;
  dialog: React.ReactNode;
} {
  const [state, setState] = useState<ConfirmResolverState | null>(null);

  function ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => setState({ options, resolve }));
  }

  function close(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  const dialog = state ? (
    <Modal
      open
      onClose={() => close(false)}
      title={state.options.title}
      size="sm"
    >
      {state.options.description && (
        <p className="text-xs text-foreground/85">{state.options.description}</p>
      )}
      <ModalActions
        onCancel={() => close(false)}
        onConfirm={() => close(true)}
        confirmLabel={state.options.confirmLabel ?? "Confirm"}
        cancelLabel={state.options.cancelLabel ?? "Cancel"}
        danger={state.options.danger}
      />
    </Modal>
  ) : null;

  return { ask, dialog };
}
