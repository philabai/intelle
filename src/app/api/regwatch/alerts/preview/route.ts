import { NextResponse } from "next/server";
import { createClient } from "@/lib/regwatch/supabase/server";
import { previewMyDigest } from "@/lib/regwatch/alerts-pipeline";
import type { DigestMode } from "@/lib/regwatch/alerts-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Renders the calling user's email digest as a plain HTML page — no Brevo
 * send, no alert_deliveries row written. Useful for previewing what the
 * digest will look like without depending on Brevo being configured.
 *
 * Returns text/html so the browser renders the email inline when opened in
 * a new tab from the AlertPrefsForm Preview button.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const modeParam = url.searchParams.get("mode");
  const mode: DigestMode = modeParam === "weekly" ? "weekly" : "daily";

  const result = await previewMyDigest(mode);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (!result.html) {
    return new Response(emptyPreview(mode, result.diagnostics), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Wrap the digest HTML in a small status banner so the user knows this is
  // a preview and not a real email.
  const banner = `
    <div style="background:#0B1020;border-bottom:1px solid #1E293B;padding:12px 16px;font-family:Inter,system-ui,sans-serif;color:#F1F5F9;font-size:13px;">
      <strong style="color:#00D4C4;">Preview</strong> · ${mode} digest · ${result.matchCount} ${result.matchCount === 1 ? "match" : "matches"} · No email was sent.
      <a href="/regwatch/settings/alerts" style="margin-left:12px;color:#94A3B8;">← Back to alerts</a>
    </div>`;

  // Inject the banner before the body content. The digest HTML is a full
  // document; insert immediately after the <body ...> tag.
  const html = result.html.replace(
    /<body[^>]*>/i,
    (match) => `${match}${banner}`,
  );

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // X-Frame-Options removed for the preview only — we want users to be
      // able to open this directly. The main site middleware still enforces
      // X-Frame-Options globally; this header on the response wins for the
      // route.
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "no-store",
    },
  });
}

function emptyPreview(
  mode: DigestMode,
  diag: { pulled: number; afterCriticalGate: number; afterDedup: number; capped: number },
): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0B1020;font-family:Inter,system-ui,sans-serif;color:#F1F5F9;">
  <div style="max-width:600px;margin:48px auto;padding:24px;background:#111827;border:1px solid #1E293B;border-radius:12px;">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#00D4C4;">Preview · ${mode} digest</p>
    <h1 style="margin:0;font-size:20px;line-height:1.3;">No matches in the ${mode === "daily" ? "last 24 hours" : "last 7 days"}.</h1>
    <p style="margin:12px 0 0;font-size:13px;color:#94A3B8;line-height:1.5;">
      Preview mode ignores the critical-only gate and skips dedup, so this is the most permissive view possible — ${diag.pulled} unresolved matches landed in the window. If you expected items here, the matcher may not have run since your last footprint change. Try clicking "Save preferences" again, or run the match cron from the Vercel dashboard.
    </p>
    <p style="margin:24px 0 0;font-size:12px;">
      <a href="/regwatch/settings/alerts" style="color:#94A3B8;">← Back to alerts</a> · <a href="/regwatch/feed" style="color:#00D4C4;margin-left:12px;">Open My Feed</a>
    </p>
  </div>
</body></html>`;
}
