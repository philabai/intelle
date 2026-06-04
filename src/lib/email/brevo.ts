/**
 * Brevo transactional email helper.
 *
 * Extracted so the main intelle app and apps/regwatch/ can share one
 * implementation. The helper never throws and never logs — it returns a
 * structured result so each caller can decide whether a failure is fatal,
 * which message to surface, and which log prefix to use.
 *
 * Env vars:
 *   BREVO_API_KEY        — required to actually send (missing => no-api-key result)
 *   BREVO_SENDER_EMAIL   — optional sender override; falls back to ADMIN_EMAIL
 *   ADMIN_EMAIL          — final fallback sender + default reply target
 */

export interface BrevoAddress {
  email: string;
  name?: string;
}

export interface SendBrevoEmailInput {
  to: BrevoAddress[];
  subject: string;
  htmlContent: string;
  sender?: BrevoAddress;
  replyTo?: BrevoAddress;
}

export type SendBrevoEmailResult =
  | { ok: true }
  | { ok: false; reason: "no-api-key" }
  | { ok: false; reason: "http-error"; status: number; body: string }
  | { ok: false; reason: "network-error"; error: unknown };

const DEFAULT_SENDER_NAME = "intelle.io";
const DEFAULT_SENDER_FALLBACK = "hello@intelle.io";

export async function sendBrevoEmail(
  input: SendBrevoEmailInput,
): Promise<SendBrevoEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { ok: false, reason: "no-api-key" };

  const senderEmail =
    input.sender?.email ||
    process.env.BREVO_SENDER_EMAIL?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    DEFAULT_SENDER_FALLBACK;
  const senderName = input.sender?.name || DEFAULT_SENDER_NAME;

  const payload: Record<string, unknown> = {
    sender: { name: senderName, email: senderEmail },
    to: input.to,
    subject: input.subject,
    htmlContent: input.htmlContent,
  };
  if (input.replyTo) payload.replyTo = input.replyTo;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, reason: "http-error", status: res.status, body };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "network-error", error };
  }
}
