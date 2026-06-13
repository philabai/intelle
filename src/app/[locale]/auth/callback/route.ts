import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";

export async function GET(request: Request) {
  const { searchParams, origin, pathname } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Locale comes from the /{locale}/auth/callback path; keep redirects prefixed.
  const seg = pathname.split("/")[1];
  const locale = (routing.locales as readonly string[]).includes(seg)
    ? seg
    : routing.defaultLocale;

  // Honor a `next` target if present (already locale-prefixed by login); else
  // land on the locale's admin home.
  const next = searchParams.get("next");
  const target =
    next && next.startsWith(`/${locale}/`) ? next : `/${locale}/admin`;
  return NextResponse.redirect(`${origin}${target}`);
}
