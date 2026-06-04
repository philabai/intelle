import type { Severity } from "./match";

/**
 * Pure email digest builder — given the matches eligible for delivery,
 * produces the Brevo subject + HTML body. No I/O, no DB. The pipeline calls
 * this and hands the result to sendBrevoEmail.
 *
 * Template inspired by Watershed's 4-section policy update (Headline /
 * Why it matters / Details / What to do now), compressed for email:
 *   Subject:   "RegWatch — N matches in your last <window>"
 *   Body:      For each match: severity dot + title + regulator + footprint
 *              chip + summary + link to detail page
 *              Footer: link to Feed + Preferences + Brevo unsubscribe
 */

export interface DigestMatch {
  matchId: string;
  score: number;
  severity: Severity;
  jurisdictionCode: string;
  citation: string;
  title: string;
  slug: string;
  summary: string | null;
  regulatorName: string;
  regulatorShortName: string | null;
  matchedAt: string;
}

export interface DigestPayload {
  subject: string;
  htmlContent: string;
  textContent: string;
  /** Match ids included — pipeline writes one alert_deliveries row per id. */
  matchIds: string[];
}

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#F87171", // red-400
  high: "#FCD34D",     // amber-300
  normal: "#00D4C4",   // brand-teal
  low: "#94A3B8",      // muted
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  normal: "Relevant",
  low: "Low",
};

interface BuildOptions {
  matches: DigestMatch[];
  window: "daily" | "weekly";
  recipientName?: string | null;
  /** Base URL used to build absolute links — defaults to https://intelle.io. */
  baseUrl?: string;
  /** Org name shown in the subject line + header. */
  orgName?: string | null;
}

export function buildDigest(opts: BuildOptions): DigestPayload | null {
  if (opts.matches.length === 0) return null;
  const baseUrl = opts.baseUrl ?? "https://intelle.io";
  const orgLabel = opts.orgName ? ` for ${escape(opts.orgName)}` : "";
  const windowLabel = opts.window === "daily" ? "24 hours" : "week";
  const subject = `RegWatch — ${opts.matches.length} regulatory ${
    opts.matches.length === 1 ? "match" : "matches"
  } in your last ${windowLabel}`;

  const rowsHtml = opts.matches
    .map((m) => {
      const dot = SEVERITY_COLOR[m.severity];
      const label = SEVERITY_LABEL[m.severity];
      const detailUrl = `${baseUrl}/regwatch/r/${m.jurisdictionCode.toLowerCase()}/${m.slug}`;
      const regulator = m.regulatorShortName ?? m.regulatorName;
      return `
        <tr>
          <td style="padding:18px 0;border-bottom:1px solid #1E293B;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="padding-bottom:6px;font-family:Inter,system-ui,sans-serif;font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:.05em;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dot};margin-right:6px;vertical-align:middle;"></span>
                  ${label} · score ${m.score.toFixed(0)} · ${escape(m.jurisdictionCode)} · ${escape(regulator)}
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:6px;">
                  <a href="${detailUrl}" style="font-family:Inter,system-ui,sans-serif;font-size:15px;line-height:1.4;color:#F1F5F9;font-weight:500;text-decoration:none;">
                    ${escape(m.title)}
                  </a>
                  <span style="font-family:'SFMono-Regular',Consolas,monospace;font-size:11px;color:#94A3B8;margin-left:6px;">${escape(m.citation)}</span>
                </td>
              </tr>
              ${
                m.summary
                  ? `<tr>
                       <td style="font-family:Inter,system-ui,sans-serif;font-size:12px;line-height:1.5;color:#94A3B8;padding-bottom:6px;">
                         ${escape(m.summary).slice(0, 240)}
                       </td>
                     </tr>`
                  : ""
              }
              <tr>
                <td>
                  <a href="${detailUrl}" style="font-family:Inter,system-ui,sans-serif;font-size:12px;color:#00D4C4;text-decoration:none;">
                    Open regulation →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  const htmlContent = `<!doctype html>
<html><body style="margin:0;padding:0;background:#0B1020;font-family:Inter,system-ui,sans-serif;color:#F1F5F9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0B1020;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:#111827;border:1px solid #1E293B;border-radius:12px;max-width:600px;width:100%;">
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#00D4C4;font-weight:500;">
                intelle.io RegWatch · ${escape(opts.window === "daily" ? "Daily digest" : "Weekly digest")}
              </p>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;color:#F1F5F9;font-weight:600;">
                ${opts.matches.length} regulatory ${opts.matches.length === 1 ? "match" : "matches"} in your last ${windowLabel}${orgLabel}
              </h1>
              <p style="margin:8px 0 0;font-size:13px;color:#94A3B8;line-height:1.5;">
                ${recipientLine(opts.recipientName)} Sorted by severity, then footprint relevance. Click any item to open the regulation.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${rowsHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;background:#0B1020;border-top:1px solid #1E293B;">
              <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.5;">
                <a href="${baseUrl}/regwatch/feed" style="color:#00D4C4;text-decoration:none;">Open My Feed</a> · <a href="${baseUrl}/regwatch/settings/alerts" style="color:#94A3B8;text-decoration:underline;">Manage alert preferences</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#64748B;line-height:1.5;">
                AI-scored relevance — verify every claim against the regulator source before relying on it for compliance evidence.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#64748B;font-family:Inter,system-ui,sans-serif;">
          intelle.io RegWatch · SparkLab LLC · Dubai
        </p>
      </td>
    </tr>
  </table>
</body></html>`;

  const textContent = [
    `intelle.io RegWatch — ${opts.window === "daily" ? "Daily digest" : "Weekly digest"}`,
    `${opts.matches.length} regulatory ${opts.matches.length === 1 ? "match" : "matches"} in your last ${windowLabel}${orgLabel}`,
    "",
    ...opts.matches.map(
      (m) =>
        `[${SEVERITY_LABEL[m.severity].toUpperCase()} ${m.score.toFixed(0)}] ${m.jurisdictionCode} · ${m.regulatorShortName ?? m.regulatorName} · ${m.citation}\n${m.title}\n${baseUrl}/regwatch/r/${m.jurisdictionCode.toLowerCase()}/${m.slug}`,
    ),
    "",
    `Open My Feed: ${baseUrl}/regwatch/feed`,
    `Manage alert preferences: ${baseUrl}/regwatch/settings/alerts`,
  ].join("\n\n");

  return {
    subject,
    htmlContent,
    textContent,
    matchIds: opts.matches.map((m) => m.matchId),
  };
}

function recipientLine(name?: string | null): string {
  if (!name) return "";
  return `${escape(name)} — `;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
