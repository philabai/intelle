"use client";

import { useState } from "react";
import type { FAQ } from "@/lib/types";

export function FAQSection({
  faqs,
  title = "Frequently asked",
}: {
  faqs: FAQ[];
  title?: string;
}) {
  const [open, setOpen] = useState<number | null>(0);
  if (!faqs?.length) return null;
  return (
    <section className="my-16 sm:my-20">
      <h2 className="text-2xl sm:text-3xl font-bold text-heading mb-8">{title}</h2>
      <div className="space-y-3">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className="rounded-xl border border-card-border bg-card-bg overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left cursor-pointer hover:bg-card-bg/60"
                aria-expanded={isOpen}
              >
                <span className="text-sm sm:text-base font-semibold text-foreground">
                  {f.q}
                </span>
                <svg
                  className={`w-4 h-4 shrink-0 text-brand-blue transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-sm leading-relaxed text-muted">
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
