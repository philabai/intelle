import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_ROLES = new Set(["admin", "content_admin", "researcher"]);

// RegWatch-protected subpaths. Everything else under /regwatch/* (including
// /regwatch itself, /regwatch/browse, /regwatch/search, /regwatch/r/*,
// /regwatch/regulator/*, /regwatch/topic/*, /regwatch/examples, /regwatch/recap,
// /regwatch/checkup, /regwatch/login, /regwatch/signup) is public.
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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin");
  const isDashboardRoute = path.startsWith("/dashboard");
  const isAuthRoute = path.startsWith("/auth");
  const isRegwatchAuthRoute =
    path === "/regwatch/login" || path === "/regwatch/signup";
  const isRegwatchProtectedRoute = isRegwatchProtected(path);

  const role = user?.app_metadata?.role as string | undefined;

  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    // Until customer roles are populated, treat any user without an explicit role as admin
    // so the existing single-user setup keeps working.
    const effective = role ?? "admin";
    if (!ADMIN_ROLES.has(effective)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (isDashboardRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
  }

  if (isAuthRoute && user && path !== "/auth/callback") {
    const url = request.nextUrl.clone();
    const effective = role ?? "admin";
    url.pathname = ADMIN_ROLES.has(effective) ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // RegWatch — protected subpaths require any authenticated user
  if (isRegwatchProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/regwatch/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // RegWatch — authed users on /regwatch/login or /regwatch/signup go to /regwatch/feed
  if (isRegwatchAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/regwatch/feed";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
