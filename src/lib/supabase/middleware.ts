import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const ADMIN_ROLES = new Set(["admin", "content_admin", "researcher"]);

// RegWatch-protected subpaths (matched against the LOCALE-STRIPPED path).
// Everything else under /regwatch/* is public.
const REGWATCH_PROTECTED_PREFIXES = [
  "/regwatch/feed",
  "/regwatch/saved",
  "/regwatch/onboarding",
  "/regwatch/settings",
  "/regwatch/briefing",
];

function isRegwatchProtected(pathname: string): boolean {
  return REGWATCH_PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Split a locale-prefixed path into its locale + the rest ("/admin/..."). */
function splitLocale(pathname: string): { locale: string; rest: string } {
  const seg = pathname.split("/")[1];
  if ((routing.locales as readonly string[]).includes(seg)) {
    const rest = pathname.slice(seg.length + 1) || "/";
    return { locale: seg, rest };
  }
  return { locale: routing.defaultLocale, rest: pathname };
}

/**
 * Supabase session refresh + auth gating, composed with next-intl. The caller
 * (src/middleware.ts) runs the i18n middleware first and passes its `response`
 * here so the NEXT_LOCALE cookie + any rewrite headers survive. All redirect
 * targets are rebuilt WITH the active locale prefix so locale is never lost.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Set refreshed-session cookies directly on the i18n response so its
          // locale cookie + rewrite headers are preserved.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { locale, rest } = splitLocale(request.nextUrl.pathname);

  // Build a locale-prefixed redirect, carrying over any refreshed cookies.
  const redirectTo = (target: string, nextPath?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${target}`;
    url.search = "";
    if (nextPath) url.searchParams.set("next", nextPath);
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  const isAdminRoute = rest.startsWith("/admin");
  const isDashboardRoute = rest.startsWith("/dashboard");
  const isAuthRoute = rest.startsWith("/auth");
  const isRegwatchAuthRoute =
    rest === "/regwatch/login" || rest === "/regwatch/signup";
  const isRegwatchProtectedRoute = isRegwatchProtected(rest);

  const role = user?.app_metadata?.role as string | undefined;

  if (isAdminRoute) {
    if (!user) return redirectTo("/auth/login", request.nextUrl.pathname);
    // Until customer roles are populated, treat any user without an explicit
    // role as admin so the existing single-user setup keeps working.
    const effective = role ?? "admin";
    if (!ADMIN_ROLES.has(effective)) return redirectTo("/dashboard");
  }

  if (isDashboardRoute) {
    if (!user) return redirectTo("/auth/login", request.nextUrl.pathname);
  }

  if (isAuthRoute && user && rest !== "/auth/callback") {
    const effective = role ?? "admin";
    return redirectTo(ADMIN_ROLES.has(effective) ? "/admin" : "/dashboard");
  }

  if (isRegwatchProtectedRoute && !user) {
    return redirectTo("/regwatch/login", request.nextUrl.pathname);
  }

  if (isRegwatchAuthRoute && user) {
    return redirectTo("/regwatch/feed");
  }

  return response;
}
