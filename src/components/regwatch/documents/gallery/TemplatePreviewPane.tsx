"use client";

import { generateHTML } from "@tiptap/html";
import { useMemo } from "react";
import { EDITOR_EXTENSIONS } from "../editor/extensions";

interface Props {
  bodyDoc: unknown;
}

/**
 * Client-side preview of a template's PM JSON. We can't easily render via
 * a server component inside an open modal (state is client-side), so we
 * run @tiptap/html on the client. The output is HTML from our own trusted
 * source (no XSS surface).
 */
export function TemplatePreviewPane({ bodyDoc }: Props) {
  const html = useMemo(() => {
    try {
      return generateHTML(
        bodyDoc as Parameters<typeof generateHTML>[0],
        EDITOR_EXTENSIONS,
      );
    } catch {
      return "";
    }
  }, [bodyDoc]);
  return (
    <div
      className="prose prose-sm prose-invert max-w-none rounded-lg border border-card-border bg-background px-5 py-4 text-xs leading-relaxed text-foreground prose-headings:font-semibold prose-h1:text-lg prose-h2:text-sm prose-h3:text-xs prose-table:border prose-table:border-card-border prose-th:bg-card-bg/40 prose-th:p-1.5 prose-td:p-1.5 prose-td:border prose-td:border-card-border"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
