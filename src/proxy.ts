import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18n = createMiddleware(routing);

/**
 * Chained middleware: next-intl locale routing FIRST, then Supabase session
 * refresh + auth gating. Order matters — the locale must resolve before auth
 * redirects so their targets keep the locale prefix. API routes are never
 * localized.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 1. Locale negotiation. If next-intl wants to redirect (bare `/`, legacy
  //    unprefixed URL, locale mismatch), return that immediately.
  const response = handleI18n(request);
  if (response.headers.get("location")) {
    return response;
  }

  // 2. Supabase session + auth gating, preserving the i18n response.
  return await updateSession(request, response);
}

export const config = {
  // Run on everything user-facing; skip api, Next internals, and static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
