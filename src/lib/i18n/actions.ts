"use server";

import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

/**
 * Persist a signed-in user's UI language choice in auth.users.user_metadata
 * (consistent with how other user attributes are stored — no extra table). Anon
 * users rely on next-intl's NEXT_LOCALE cookie, so this is a no-op for them.
 * Best-effort: the URL/cookie already reflect the choice; this just records it
 * for future sessions / other devices.
 */
export async function setPreferredLocale(locale: string): Promise<void> {
  if (!(routing.locales as readonly string[]).includes(locale)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  if (user.user_metadata?.preferred_locale === locale) return;
  await supabase.auth.updateUser({ data: { preferred_locale: locale } });
}
