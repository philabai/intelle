"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { setPreferredLocale } from "@/lib/i18n/actions";

const LABELS: Record<string, string> = {
  en: "EN",
  fr: "FR",
  ar: "ع",
};
const TITLES: Record<string, string> = {
  en: "English",
  fr: "Français",
  ar: "العربية",
};

/**
 * Compact locale switcher. Swaps the locale prefix on the current path (keeping
 * the rest of the URL) via next-intl's router, and persists the choice for
 * signed-in users. Anonymous users persist through the NEXT_LOCALE cookie.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchTo(next: string) {
    if (next === locale || pending) return;
    startTransition(() => {
      void setPreferredLocale(next);
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-md border border-card-border bg-card-bg/60 p-0.5 text-[11px] ${className ?? ""}`}
      role="group"
      aria-label="Language"
    >
      {routing.locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => switchTo(l)}
            title={TITLES[l]}
            aria-current={active ? "true" : undefined}
            className={`rounded px-1.5 py-0.5 font-medium transition ${
              active
                ? "bg-brand-blue text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {LABELS[l] ?? l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
