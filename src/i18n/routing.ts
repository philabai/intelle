import { defineRouting } from "next-intl/routing";

/**
 * Locale routing for intelle/Vantage. Every locale is prefixed uniformly
 * (`/en/*`, `/fr/*`, `/ar/*`); bare `/` and any legacy unprefixed URL 301 to
 * the `en` equivalent (next-intl's middleware emits these). Arabic is RTL.
 */
export const routing = defineRouting({
  locales: ["en", "fr", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

/** Text direction for a locale. */
export function localeDir(locale: string): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
