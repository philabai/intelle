import { NextResponse } from "next/server";
import { createClient } from "@/lib/regwatch/supabase/server";
import { safeRelativePath } from "@/lib/safe-redirect";

/**
 * RegWatch OAuth / magic-link / email-confirmation landing. Distinct from the
 * main app's /auth/callback so the redirect flow stays scoped to /regwatch.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRelativePath(url.searchParams.get("next"), "/regwatch/dashboard");

  if (!code) {
    return NextResponse.redirect(new URL("/regwatch/login?error=missing-code", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/regwatch/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
