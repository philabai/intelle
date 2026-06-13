import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "./navigation";

/**
 * Locale-aware server redirect. next-intl's `redirect` requires an explicit
 * locale; this reads the current request locale via `getLocale()` so call sites
 * can keep passing a bare href. Use for INTERNAL app paths only (external URLs —
 * e.g. Stripe checkout — must use `redirect` from `next/navigation`).
 *
 *   if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/feed");
 */
export async function localizedRedirect(href: string): Promise<never> {
  const locale = await getLocale();
  redirect({ href, locale });
  // `redirect` throws (NEXT_REDIRECT); this is unreachable but satisfies `never`.
  throw new Error("unreachable");
}
