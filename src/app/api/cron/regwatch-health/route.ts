import { NextResponse } from "next/server";
import { runHealthCheck, renderHealthEmail } from "@/lib/regwatch/health-check";
import { sendBrevoEmail } from "@/lib/email/brevo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily app health digest. Inspects the crawl → enrich → match → alert
 * pipelines + Outreach and emails a consolidated OK/WARN/CRITICAL report to the
 * ops address. Auth: Bearer CRON_SECRET.
 *
 * Recipients: comma-separated HEALTH_REPORT_EMAIL env var. When unset, the
 * report is computed and returned in the response but no email is sent.
 *
 * Query params:
 *   ?send=0  — compute + return the report JSON without emailing (manual test)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const report = await runHealthCheck();
  const wantSend = url.searchParams.get("send") !== "0";
  const recipients = (process.env.HEALTH_REPORT_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let emailed = false;
  let emailError: string | null = null;
  if (wantSend && recipients.length > 0) {
    const { subject, html } = renderHealthEmail(report);
    const res = await sendBrevoEmail({
      to: recipients.map((email) => ({ email })),
      subject,
      htmlContent: html,
    });
    if (res.ok) emailed = true;
    else emailError = res.reason === "http-error" ? `Brevo ${res.status}: ${res.body.slice(0, 200)}` : res.reason;
  }

  return NextResponse.json({
    ok: true,
    overall: report.overall,
    emailed,
    recipients: recipients.length,
    emailError,
    report,
  });
}
