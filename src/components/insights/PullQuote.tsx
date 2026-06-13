import type { ReactNode } from "react";

export function PullQuote({ children }: { children?: ReactNode }) {
  return (
    <blockquote className="my-8 border-s-4 border-brand-teal ps-6 py-2 italic text-foreground/90 text-lg leading-relaxed">
      {children}
    </blockquote>
  );
}
