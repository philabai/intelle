"use client";

import { useRef, type RefObject } from "react";
import { toUnicodeBold, toUnicodeItalic } from "@/lib/unicode-format";

type Props = {
  /** Ref to the textarea this toolbar formats. */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Called with the new full value after a transformation, so the parent
   *  React state stays in sync. */
  onChange: (newValue: string) => void;
};

export function UnicodeFormatHelpers({ textareaRef, onChange }: Props) {
  const lastFocus = useRef<{ start: number; end: number } | null>(null);

  function applyTransform(transform: (s: string) => string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      // Nothing selected — nothing to transform. Restore focus.
      ta.focus();
      return;
    }
    const value = ta.value;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    const transformed = transform(selected);
    const newValue = before + transformed + after;
    onChange(newValue);
    lastFocus.current = { start, end: start + transformed.length };
    // Re-apply selection on the next tick so React's controlled value has time to flush.
    requestAnimationFrame(() => {
      const ta2 = textareaRef.current;
      if (!ta2 || !lastFocus.current) return;
      ta2.focus();
      ta2.setSelectionRange(lastFocus.current.start, lastFocus.current.end);
    });
  }

  return (
    <div className="flex items-center gap-2 mb-2 text-xs">
      <button
        type="button"
        onClick={() => applyTransform(toUnicodeBold)}
        title="Convert selected text to Unicode bold (renders bold on LinkedIn)"
        className="px-2.5 py-1 rounded border border-card-border bg-background hover:border-brand-blue/50 text-foreground font-bold cursor-pointer"
      >
        𝐁
      </button>
      <button
        type="button"
        onClick={() => applyTransform(toUnicodeItalic)}
        title="Convert selected text to Unicode italic (renders italic on LinkedIn)"
        className="px-2.5 py-1 rounded border border-card-border bg-background hover:border-brand-blue/50 text-foreground italic cursor-pointer"
      >
        𝐼
      </button>
      <span className="text-muted/60 ml-2">
        Select text first, then click a button. Unicode formatting renders on LinkedIn but is inaccessible to screen readers — use sparingly.
      </span>
    </div>
  );
}
