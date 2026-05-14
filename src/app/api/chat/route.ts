import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/anthropic/client";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";
import { IRIS_TOOLS, type CaptureEmailInput } from "@/lib/chat/tools";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const IRIS_MODEL = "claude-haiku-4-5-20251001";
const MAX_TURNS = 3;
const MAX_TOKENS = 1024;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([
    z.string(),
    z.array(z.any()),
  ]),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
});

type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; id: string; result: string; is_error?: boolean }
  | { type: "done"; stopReason: string | null }
  | { type: "error"; message: string };

function sse(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Lead-capture pipeline. Two independent legs:
 *   1. Insert into `contact_submissions` (same table the /contact form uses,
 *      so leads land in /admin/contacts). Failure here IS fatal — without
 *      the row, the lead is lost.
 *   2. Notify the Senior Practitioner via Brevo. Failure here is NON-fatal —
 *      the lead is already in the DB; we log and continue. We don't want a
 *      Brevo misconfig to break the user-facing chat experience.
 *
 * Recipient resolution: ADMIN_EMAIL env var → arnab@intelle.io fallback.
 * Sender: BREVO_SENDER_EMAIL env var → ADMIN_EMAIL → arnab@intelle.io.
 * The Brevo sender MUST be verified in your Brevo account; if it isn't,
 * Brevo returns an error and this function logs the response body verbatim.
 */
async function notifySeniorPractitionerOfLead(
  input: CaptureEmailInput,
  sourceUrl: string | null,
) {
  const supabase = createServiceClient();

  // Leg 1 — persist to contact_submissions (FATAL on failure)
  const { error: insertError } = await supabase
    .from("contact_submissions")
    .insert({
      name: input.name ?? "(via Iris chat)",
      email: input.email,
      company: input.company ?? null,
      phone: null,
      service_interest: null,
      message: input.context,
      source_page: sourceUrl ?? "iris-chat",
    });

  if (insertError) {
    console.error("[iris] supabase insert failed:", {
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
    });
    throw new Error(`Failed to save lead: ${insertError.message}`);
  }

  // Leg 2 — notify via Brevo (NON-fatal on failure; lead is already saved)
  const brevoKey = process.env.BREVO_API_KEY;
  if (!brevoKey) {
    console.warn("[iris] BREVO_API_KEY not set — lead saved but no email sent");
    return;
  }

  const adminEmail =
    process.env.ADMIN_EMAIL?.trim() || "arnab@intelle.io";
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL?.trim() || adminEmail;

  const subject = `New Iris lead: ${input.email}`;
  const html = `
    <h2>New lead from Iris (intelle.io chat)</h2>
    <p><strong>Email:</strong> <a href="mailto:${input.email}">${input.email}</a></p>
    ${input.name ? `<p><strong>Name:</strong> ${input.name}</p>` : ""}
    ${input.company ? `<p><strong>Company:</strong> ${input.company}</p>` : ""}
    <p><strong>Context:</strong> ${input.context}</p>
    ${sourceUrl ? `<p><strong>From page:</strong> ${sourceUrl}</p>` : ""}
    <hr/>
    <p style="color:#666;font-size:12px;">Also in /admin/contacts. Reply directly to the visitor by clicking the email link above.</p>
  `;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "intelle.io · Iris", email: senderEmail },
        replyTo: { email: input.email, name: input.name ?? "Iris lead" },
        to: [{ email: adminEmail }],
        subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[iris] Brevo API error:", {
        status: res.status,
        statusText: res.statusText,
        body,
        sender: senderEmail,
        recipient: adminEmail,
      });
      // Don't throw — lead is already saved.
    }
  } catch (e) {
    console.error("[iris] Brevo fetch threw:", e);
    // Don't throw — lead is already saved.
  }
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof requestSchema>;
  try {
    const body = await request.json();
    parsed = requestSchema.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sourceUrl = request.headers.get("referer");
  const anthropic = getAnthropic();
  const systemPrompt = buildSystemPrompt();

  // Build the working messages array — Anthropic format
  const messages: Anthropic.Messages.MessageParam[] = parsed.messages.map(
    (m) => ({
      role: m.role,
      // Pass content through — strings stay strings, arrays (tool_result blocks
      // from prior assistant turns) stay arrays.
      content: m.content as Anthropic.Messages.MessageParam["content"],
    }),
  );

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(sse(e)));

      try {
        let turn = 0;
        while (turn < MAX_TURNS) {
          turn += 1;

          if (process.env.NODE_ENV !== "production") {
            console.log("[iris] turn", turn, "→ outbound messages:", JSON.stringify(messages, null, 2));
          }

          const apiStream = anthropic.messages.stream({
            model: IRIS_MODEL,
            max_tokens: MAX_TOKENS,
            system: [
              {
                type: "text",
                text: systemPrompt,
                cache_control: { type: "ephemeral" },
              },
            ],
            tools: IRIS_TOOLS,
            messages,
          });

          // Stream text deltas to the client as they arrive; rely on the SDK's
          // finalMessage() for the assembled assistant content (avoids manual
          // event parsing bugs and matches the SDK's validated shape).
          for await (const event of apiStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              send({ type: "text", text: event.delta.text });
            }
          }

          const finalMessage = await apiStream.finalMessage();
          const stopReason = finalMessage.stop_reason;

          // Convert the SDK's response ContentBlocks to ContentBlockParams for
          // re-use in the next iteration's outbound messages array. We strip
          // response-only fields (citations, caller) and keep what the API
          // accepts as input.
          const assistantContent: Anthropic.Messages.ContentBlockParam[] =
            finalMessage.content
              .filter((b) => b.type === "text" || b.type === "tool_use")
              .map((b) => {
                if (b.type === "text") {
                  return { type: "text", text: b.text };
                }
                return {
                  type: "tool_use",
                  id: b.id,
                  name: b.name,
                  input: b.input,
                };
              });

          // Emit tool_use events to the client (the buttons it renders)
          for (const b of assistantContent) {
            if (b.type === "tool_use") {
              send({
                type: "tool_use",
                id: b.id,
                name: b.name,
                input: b.input as Record<string, unknown>,
              });
            }
          }

          // Push the completed assistant message into history
          messages.push({
            role: "assistant",
            content: assistantContent,
          });

          if (stopReason !== "tool_use") {
            send({ type: "done", stopReason });
            controller.close();
            return;
          }

          // Synthesize tool_results for the next loop iteration
          const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
          for (const block of assistantContent) {
            if (block.type !== "tool_use") continue;
            try {
              if (block.name === "capture_email") {
                const input = block.input as CaptureEmailInput;
                await notifySeniorPractitionerOfLead(input, sourceUrl);
                const result = `Lead captured. Email ${input.email} saved and our Senior Practitioner notified by email.`;
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: result,
                });
                send({ type: "tool_result", id: block.id, result });
              } else {
                // UI-only tools: tell Claude they were displayed to the user.
                const result = `Displayed to the user as an inline button. They can click it themselves.`;
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: result,
                });
                // Emit to client too so the client can mirror the full
                // assistant+tool_result history on its next request — required
                // for Anthropic to accept the conversation on subsequent turns.
                send({ type: "tool_result", id: block.id, result });
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : "Tool failed";
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: `Tool failed: ${msg}`,
                is_error: true,
              });
              send({
                type: "tool_result",
                id: block.id,
                result: msg,
                is_error: true,
              });
            }
          }

          messages.push({ role: "user", content: toolResults });
        }

        send({ type: "done", stopReason: "max_turns" });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[iris] stream error:", err);
        send({ type: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
