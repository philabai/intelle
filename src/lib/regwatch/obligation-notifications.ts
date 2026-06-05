import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { sendBrevoEmail } from "@/lib/email/brevo";
import {
  sendPushToSubscription,
  countRecentPushDeliveries,
  deleteSubscription,
  recordPushDelivery,
  type PushPayload,
} from "./push";
import { canUseFeature } from "./tier";
import type { Tier } from "./stripe";

/**
 * Obligation notification fanout — drains
 * regwatch.obligation_notification_queue and sends via Brevo + Web Push.
 *
 *   - Email goes to every recipient whose org tier allows email digests
 *     (Pro+) — gating piggybacks on the existing email_digests feature.
 *   - Web push goes to every recipient whose org allows push (Pro+) and
 *     who has at least one active push_subscription. Respects the same
 *     3/24h cap as the existing push pipeline.
 *   - alert_deliveries is the idempotency log shared with the digest +
 *     critical-alert pipelines so a user never gets the same item twice
 *     on the same channel.
 *
 * Per kind:
 *   obligation_assigned                — to reviewer
 *   regulation_changed_for_obligation  — to reviewer (their open obligation)
 *   regulation_changed_for_doc         — to doc owner (their linked doc)
 *   obligation_pending_approval        — to every org admin
 *   obligation_signed_off              — to reviewer
 *   obligation_kicked_back             — to reviewer
 */

type Kind =
  | "obligation_assigned"
  | "regulation_changed_for_obligation"
  | "regulation_changed_for_doc"
  | "obligation_pending_approval"
  | "obligation_signed_off"
  | "obligation_kicked_back"
  | "evidence_analysis_completed"
  | "evidence_analysis_flagged_discrepancy";

interface QueueRow {
  id: string;
  organization_id: string;
  recipient_user_id: string;
  kind: Kind;
  obligation_id: string | null;
  regulatory_item_id: string | null;
  internal_document_id: string | null;
  payload: Record<string, unknown>;
  fail_count: number;
}

export interface NotifyResult {
  considered: number;
  emails_sent: number;
  pushes_sent: number;
  marked_sent: number;
  errors: string[];
  duration_ms: number;
}

const PUSH_CAP_24H = 3;

export async function runObligationNotificationFanout(
  batchSize = 30,
): Promise<NotifyResult> {
  const started = Date.now();
  const result: NotifyResult = {
    considered: 0,
    emails_sent: 0,
    pushes_sent: 0,
    marked_sent: 0,
    errors: [],
    duration_ms: 0,
  };

  const svc = createServiceClient();

  // 1. Drain a batch of pending queue rows.
  const { data: queueRows, error: qErr } = await svc
    .from("obligation_notification_queue")
    .select(
      "id, organization_id, recipient_user_id, kind, obligation_id, regulatory_item_id, internal_document_id, payload, fail_count",
    )
    .is("sent_at", null)
    .lt("fail_count", 5)
    .order("enqueued_at", { ascending: true })
    .limit(batchSize);
  if (qErr) {
    result.errors.push(`queue read: ${qErr.message}`);
    result.duration_ms = Date.now() - started;
    return result;
  }
  const rows = (queueRows ?? []) as QueueRow[];
  result.considered = rows.length;
  if (rows.length === 0) {
    result.duration_ms = Date.now() - started;
    return result;
  }

  // 2. Bulk-load all subjects (obligations / regulations / documents / org tiers
  // / recipient profiles) in a few round-trips rather than per-row.
  const orgIds = Array.from(new Set(rows.map((r) => r.organization_id)));
  const obligationIds = Array.from(
    new Set(rows.map((r) => r.obligation_id).filter((x): x is string => !!x)),
  );
  const regItemIds = Array.from(
    new Set(
      rows.map((r) => r.regulatory_item_id).filter((x): x is string => !!x),
    ),
  );
  const docIds = Array.from(
    new Set(
      rows.map((r) => r.internal_document_id).filter((x): x is string => !!x),
    ),
  );
  const recipientIds = Array.from(
    new Set(rows.map((r) => r.recipient_user_id)),
  );

  const { data: orgRows } = await svc
    .from("organizations")
    .select("id, name, tier")
    .in("id", orgIds);
  const orgById = new Map<
    string,
    { name: string; tier: Tier }
  >(
    (orgRows ?? []).map((o) => [
      o.id as string,
      { name: o.name as string, tier: (o.tier as Tier) ?? "free" },
    ]),
  );

  type ObligationSubject = {
    id: string;
    severity: string;
    compliance_status: string;
    review_status: string;
    regulatory_item_id: string | null;
    clause_anchor: string | null;
  };
  const obligationById = new Map<string, ObligationSubject>();
  if (obligationIds.length > 0) {
    const { data: oRows } = await svc
      .from("compliance_obligations")
      .select(
        "id, severity, compliance_status, review_status, regulatory_item_id, clause_anchor",
      )
      .in("id", obligationIds);
    for (const r of oRows ?? []) {
      obligationById.set(r.id as string, {
        id: r.id as string,
        severity: r.severity as string,
        compliance_status: r.compliance_status as string,
        review_status: r.review_status as string,
        regulatory_item_id: (r.regulatory_item_id as string | null) ?? null,
        clause_anchor: (r.clause_anchor as string | null) ?? null,
      });
    }
  }

  type RegSubject = {
    id: string;
    citation: string;
    title: string;
    jurisdiction_code: string;
    source_url: string;
    regulator_name: string;
  };
  const regById = new Map<string, RegSubject>();
  if (regItemIds.length > 0) {
    const { data: rRows } = await svc
      .from("regulatory_items")
      .select(
        "id, citation, title, jurisdiction_code, source_url, regulator:regulators!inner ( name, short_name )",
      )
      .in("id", regItemIds);
    for (const r of rRows ?? []) {
      const reg = Array.isArray(r.regulator)
        ? r.regulator[0]
        : (r.regulator as { name: string; short_name: string | null } | null);
      regById.set(r.id as string, {
        id: r.id as string,
        citation: r.citation as string,
        title: r.title as string,
        jurisdiction_code: r.jurisdiction_code as string,
        source_url: r.source_url as string,
        regulator_name:
          (reg?.short_name as string | null) ??
          (reg?.name as string | null) ??
          "Unknown regulator",
      });
    }
  }

  type DocSubject = {
    id: string;
    title: string;
    internal_code: string | null;
    version: string | null;
  };
  const docById = new Map<string, DocSubject>();
  if (docIds.length > 0) {
    const { data: dRows } = await svc
      .from("internal_documents")
      .select("id, title, internal_code, version")
      .in("id", docIds);
    for (const d of dRows ?? []) {
      docById.set(d.id as string, {
        id: d.id as string,
        title: d.title as string,
        internal_code: (d.internal_code as string | null) ?? null,
        version: (d.version as string | null) ?? null,
      });
    }
  }

  const recipientById = new Map<
    string,
    { email: string | null; name: string | null }
  >();
  for (const id of recipientIds) {
    try {
      const { data: u } = await svc.auth.admin.getUserById(id);
      if (u.user) {
        recipientById.set(id, {
          email: u.user.email ?? null,
          name:
            (u.user.user_metadata?.full_name as string | undefined) ?? null,
        });
      }
    } catch {
      // skip — recipient lookup failure is non-fatal
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://intelle.io";
  const pushConfigured = Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY,
  );

  // 3. Per-row: render template, send email + push, write alert_deliveries,
  // mark queue row sent.
  for (const row of rows) {
    const org = orgById.get(row.organization_id);
    const recipient = recipientById.get(row.recipient_user_id);
    if (!org || !recipient || !recipient.email) {
      await svc
        .from("obligation_notification_queue")
        .update({
          failed_at: new Date().toISOString(),
          fail_count: row.fail_count + 1,
          last_error: !org
            ? "org not found"
            : "recipient has no email",
        })
        .eq("id", row.id);
      continue;
    }

    const subjects = {
      obligation: row.obligation_id
        ? (obligationById.get(row.obligation_id) ?? null)
        : null,
      reg: row.regulatory_item_id
        ? (regById.get(row.regulatory_item_id) ?? null)
        : null,
      doc: row.internal_document_id
        ? (docById.get(row.internal_document_id) ?? null)
        : null,
    };

    const rendered = renderTemplate({
      kind: row.kind,
      orgName: org.name,
      recipientName: recipient.name,
      payload: row.payload,
      subjects,
      baseUrl,
    });
    if (!rendered) {
      await svc
        .from("obligation_notification_queue")
        .update({
          failed_at: new Date().toISOString(),
          fail_count: row.fail_count + 1,
          last_error: "render returned null (missing subject)",
        })
        .eq("id", row.id);
      continue;
    }

    let emailOk = false;
    let pushOk = false;

    // Email — Pro+ only; idempotent via alert_deliveries on the regulation.
    if (canUseFeature(org.tier, "email_digests")) {
      const { data: existing } = await svc
        .from("alert_deliveries")
        .select("id")
        .eq("user_id", row.recipient_user_id)
        .eq("channel", "email")
        .eq("regulatory_item_id", row.regulatory_item_id ?? "00000000-0000-0000-0000-000000000000")
        .eq("delivery_metadata->>obligation_id", row.obligation_id ?? "")
        .eq("delivery_metadata->>kind", row.kind)
        .limit(1)
        .maybeSingle();
      if (!existing) {
        const sent = await sendBrevoEmail({
          to: [
            {
              email: recipient.email,
              name: recipient.name ?? undefined,
            },
          ],
          subject: rendered.subject,
          htmlContent: rendered.html,
        });
        if (sent.ok) {
          emailOk = true;
          result.emails_sent += 1;
          await svc.from("alert_deliveries").insert({
            organization_id: row.organization_id,
            user_id: row.recipient_user_id,
            regulatory_item_id:
              row.regulatory_item_id ??
              "00000000-0000-0000-0000-000000000000",
            channel: "email",
            delivery_status: "sent",
            delivery_metadata: {
              kind: row.kind,
              obligation_id: row.obligation_id ?? null,
              internal_document_id: row.internal_document_id ?? null,
              subject: rendered.subject,
            },
          });
        } else {
          const reason =
            sent.reason === "http-error"
              ? `Brevo ${sent.status}: ${sent.body.slice(0, 160)}`
              : sent.reason;
          result.errors.push(`email ${row.id}: ${reason}`);
        }
      } else {
        emailOk = true; // idempotent already-sent
      }
    }

    // Web push — Pro+ AND configured AND under the 3/24h cap.
    if (
      pushConfigured &&
      rendered.push &&
      canUseFeature(org.tier, "web_push")
    ) {
      const recent = await countRecentPushDeliveries(row.recipient_user_id);
      if (recent < PUSH_CAP_24H) {
        const { data: subs } = await svc
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", row.recipient_user_id);
        if (subs && subs.length > 0) {
          let anyDelivered = false;
          for (const sub of subs) {
            const r = await sendPushToSubscription(
              {
                endpoint: sub.endpoint as string,
                p256dh: sub.p256dh as string,
                auth: sub.auth as string,
              },
              rendered.push,
            );
            if (r.ok) anyDelivered = true;
            else if (r.reason === "expired") {
              await deleteSubscription(sub.id as string);
            }
          }
          if (anyDelivered) {
            await recordPushDelivery({
              userId: row.recipient_user_id,
              organizationId: row.organization_id,
              regulatoryItemId:
                row.regulatory_item_id ??
                "00000000-0000-0000-0000-000000000000",
              subscriptionEndpoint: subs[0]?.endpoint as string,
              status: "sent",
            });
            pushOk = true;
            result.pushes_sent += 1;
          }
        }
      }
    }

    // Mark queue row sent — successful when EITHER email or push got through,
    // OR neither channel was eligible (tier doesn't allow → still mark sent so
    // we don't retry pointlessly). The DB has the trail either way.
    const channelsEligible =
      canUseFeature(org.tier, "email_digests") ||
      (pushConfigured && canUseFeature(org.tier, "web_push"));
    if (emailOk || pushOk || !channelsEligible) {
      await svc
        .from("obligation_notification_queue")
        .update({
          sent_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      result.marked_sent += 1;
    } else {
      // Genuine send failure on an eligible channel — increment fail count.
      await svc
        .from("obligation_notification_queue")
        .update({
          failed_at: new Date().toISOString(),
          fail_count: row.fail_count + 1,
          last_error: "all eligible channels failed",
        })
        .eq("id", row.id);
    }
  }

  result.duration_ms = Date.now() - started;
  return result;
}

// ===========================================================================
// Template rendering
// ===========================================================================

interface RenderInput {
  kind: Kind;
  orgName: string;
  recipientName: string | null;
  payload: Record<string, unknown>;
  subjects: {
    obligation: {
      id: string;
      severity: string;
      compliance_status: string;
      review_status: string;
      regulatory_item_id: string | null;
      clause_anchor: string | null;
    } | null;
    reg: {
      id: string;
      citation: string;
      title: string;
      jurisdiction_code: string;
      source_url: string;
      regulator_name: string;
    } | null;
    doc: {
      id: string;
      title: string;
      internal_code: string | null;
      version: string | null;
    } | null;
  };
  baseUrl: string;
}

interface RenderedNotification {
  subject: string;
  html: string;
  push: PushPayload | null;
}

function renderTemplate(input: RenderInput): RenderedNotification | null {
  switch (input.kind) {
    case "obligation_assigned":
      return renderObligationAssigned(input);
    case "regulation_changed_for_obligation":
      return renderRegulationChangedForObligation(input);
    case "regulation_changed_for_doc":
      return renderRegulationChangedForDoc(input);
    case "obligation_pending_approval":
      return renderObligationPendingApproval(input);
    case "obligation_signed_off":
      return renderObligationSignedOff(input);
    case "obligation_kicked_back":
      return renderObligationKickedBack(input);
    case "evidence_analysis_completed":
      return renderEvidenceAnalysisCompleted(input);
    case "evidence_analysis_flagged_discrepancy":
      return renderEvidenceAnalysisFlaggedDiscrepancy(input);
  }
}

function renderObligationAssigned(
  input: RenderInput,
): RenderedNotification | null {
  const o = input.subjects.obligation;
  if (!o) return null;
  const reg = input.subjects.reg;
  const subject = `[Assigned] ${reg?.citation ?? "Obligation"} — review needed`;
  const url = `${input.baseUrl}/regwatch/obligations/${o.id}`;
  const html = layout({
    hello: helloLine(input.recipientName),
    orgName: input.orgName,
    eyebrow: "Assigned to you",
    headline: reg
      ? `Review ${escape(reg.citation)} for compliance`
      : "Review a new compliance obligation",
    body: reg
      ? `<p>An admin has assigned you to review the impact of <strong>${escape(reg.title)}</strong> (${escape(reg.regulator_name)}, ${escape(reg.jurisdiction_code)}). Severity: ${escape(o.severity)}. Status: ${escape(o.compliance_status)}.</p>${o.clause_anchor ? `<p>Pinned to clause <strong>${escape(o.clause_anchor)}</strong>.</p>` : ""}`
      : `<p>An admin has assigned you a new compliance obligation. Severity: ${escape(o.severity)}.</p>`,
    cta: { label: "Open the obligation →", url },
  });
  const push: PushPayload = {
    title: `Assigned · ${reg?.citation ?? "Obligation"}`,
    body: reg ? `${reg.title.slice(0, 90)}` : "Review needed",
    url: `/regwatch/obligations/${o.id}`,
    severity: "normal",
  };
  return { subject, html, push };
}

function renderRegulationChangedForObligation(
  input: RenderInput,
): RenderedNotification | null {
  const o = input.subjects.obligation;
  const reg = input.subjects.reg;
  if (!o || !reg) return null;
  const subject = `[Updated] ${reg.citation} — review your open obligation`;
  const url = `${input.baseUrl}/regwatch/obligations/${o.id}`;
  const html = layout({
    hello: helloLine(input.recipientName),
    orgName: input.orgName,
    eyebrow: "Regulation changed",
    headline: `${escape(reg.title)} was updated`,
    body: `<p>You have an open obligation pinned to this regulation (${escape(reg.regulator_name)} · <span style="font-family:ui-monospace,Menlo,monospace;">${escape(reg.citation)}</span>). Open it to re-check whether your prior assessment still holds.</p>${o.clause_anchor ? `<p>Your obligation is pinned to clause <strong>${escape(o.clause_anchor)}</strong>.</p>` : ""}`,
    cta: { label: "Re-review the obligation →", url },
  });
  const push: PushPayload = {
    title: `Updated · ${reg.citation}`,
    body: `Your obligation needs re-review`,
    url: `/regwatch/obligations/${o.id}`,
    severity: "high",
  };
  return { subject, html, push };
}

function renderRegulationChangedForDoc(
  input: RenderInput,
): RenderedNotification | null {
  const doc = input.subjects.doc;
  const reg = input.subjects.reg;
  if (!doc || !reg) return null;
  const subject = `[Updated] ${reg.citation} — review ${doc.internal_code ?? doc.title}`;
  const url = `${input.baseUrl}/regwatch/documents/${doc.id}`;
  const docLabel = doc.internal_code ?? doc.title;
  const html = layout({
    hello: helloLine(input.recipientName),
    orgName: input.orgName,
    eyebrow: "Linked regulation changed",
    headline: `${escape(reg.title)} was updated`,
    body: `<p>You own <strong>${escape(docLabel)}</strong>${doc.version ? ` (${escape(doc.version)})` : ""}, which is linked to this regulation (${escape(reg.regulator_name)} · <span style="font-family:ui-monospace,Menlo,monospace;">${escape(reg.citation)}</span>).</p><p>The link has been auto-superseded against the new version. Re-confirm or update the link from the document detail page.</p>`,
    cta: { label: "Open the document →", url },
  });
  const push: PushPayload = {
    title: `Linked reg updated · ${reg.citation}`,
    body: `${docLabel} needs your review`,
    url: `/regwatch/documents/${doc.id}`,
    severity: "high",
  };
  return { subject, html, push };
}

function renderObligationPendingApproval(
  input: RenderInput,
): RenderedNotification | null {
  const o = input.subjects.obligation;
  if (!o) return null;
  const reg = input.subjects.reg;
  const subject = `[Sign-off] ${reg?.citation ?? "Obligation"} ready for admin review`;
  const url = `${input.baseUrl}/regwatch/obligations/${o.id}`;
  const html = layout({
    hello: helloLine(input.recipientName),
    orgName: input.orgName,
    eyebrow: "Awaiting sign-off",
    headline: reg
      ? `${escape(reg.title)} — review submitted`
      : `Obligation review submitted`,
    body: reg
      ? `<p>The reviewer has submitted their assessment of <strong>${escape(reg.citation)}</strong> for sign-off. Severity stayed at <strong>${escape(o.severity)}</strong>; compliance status is <strong>${escape(o.compliance_status)}</strong>.</p>`
      : `<p>A reviewer has submitted an obligation for your sign-off.</p>`,
    cta: { label: "Sign off or kick back →", url },
  });
  const push: PushPayload = {
    title: `Sign-off · ${reg?.citation ?? "Obligation"}`,
    body: `Reviewer submitted; needs admin approval`,
    url: `/regwatch/obligations/${o.id}`,
    severity: "normal",
  };
  return { subject, html, push };
}

function renderObligationSignedOff(
  input: RenderInput,
): RenderedNotification | null {
  const o = input.subjects.obligation;
  if (!o) return null;
  const reg = input.subjects.reg;
  const rationale =
    typeof input.payload.rationale === "string"
      ? input.payload.rationale
      : null;
  const subject = `[Verified] ${reg?.citation ?? "Obligation"} signed off`;
  const url = `${input.baseUrl}/regwatch/obligations/${o.id}`;
  const html = layout({
    hello: helloLine(input.recipientName),
    orgName: input.orgName,
    eyebrow: "Signed off",
    headline: reg
      ? `${escape(reg.title)} — admin verified`
      : `Obligation verified`,
    body: `<p>Your review has been signed off and the obligation is now <strong>verified</strong>.</p>${rationale ? `<p style="margin-top:12px;padding:8px;border-left:3px solid #00d4c4;background:#0b1220;color:#cbd5e1;"><span style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Sign-off rationale</span><br/>${escape(rationale)}</p>` : ""}`,
    cta: { label: "View the verified obligation →", url },
  });
  const push: PushPayload = {
    title: `Verified · ${reg?.citation ?? "Obligation"}`,
    body: rationale ? rationale.slice(0, 100) : "Your review was signed off",
    url: `/regwatch/obligations/${o.id}`,
    severity: "normal",
  };
  return { subject, html, push };
}

function renderObligationKickedBack(
  input: RenderInput,
): RenderedNotification | null {
  const o = input.subjects.obligation;
  if (!o) return null;
  const reg = input.subjects.reg;
  const notes =
    typeof input.payload === "string"
      ? input.payload
      : typeof input.payload.notes === "string"
        ? (input.payload.notes as string)
        : null;
  const subject = `[Kicked back] ${reg?.citation ?? "Obligation"} needs revisions`;
  const url = `${input.baseUrl}/regwatch/obligations/${o.id}`;
  const html = layout({
    hello: helloLine(input.recipientName),
    orgName: input.orgName,
    eyebrow: "Kicked back for revisions",
    headline: reg
      ? `${escape(reg.title)} — admin asked for changes`
      : `Obligation needs revisions`,
    body: `<p>Your review was sent back for revisions before sign-off.</p>${notes ? `<p style="margin-top:12px;padding:8px;border-left:3px solid #fcd34d;background:#0b1220;color:#cbd5e1;"><span style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Admin notes</span><br/>${escape(notes)}</p>` : ""}`,
    cta: { label: "Open the obligation →", url },
  });
  const push: PushPayload = {
    title: `Kicked back · ${reg?.citation ?? "Obligation"}`,
    body: notes ? notes.slice(0, 100) : "Needs revisions",
    url: `/regwatch/obligations/${o.id}`,
    severity: "high",
  };
  return { subject, html, push };
}

function renderEvidenceAnalysisCompleted(
  input: RenderInput,
): RenderedNotification | null {
  const o = input.subjects.obligation;
  if (!o) return null;
  const reg = input.subjects.reg;
  const fileName = stringFromPayload(input.payload.file_name);
  const summary = stringFromPayload(input.payload.summary);
  const subject = `[Analysed] ${fileName ? fileName : "Evidence"} — no discrepancies`;
  const url = `${input.baseUrl}/regwatch/obligations/${o.id}`;
  const html = layout({
    hello: helloLine(input.recipientName),
    orgName: input.orgName,
    eyebrow: "Evidence analysed",
    headline: fileName
      ? `${escape(fileName)} — AI analysis complete`
      : "Evidence analysis complete",
    body: `<p>The AI analysis of your evidence ${reg ? `against <strong>${escape(reg.citation)}</strong>` : ""} returned no discrepancies. You can proceed to submit for approval.</p>${summary ? `<p style="margin-top:12px;padding:8px;border-left:3px solid #00d4c4;background:#0b1220;color:#cbd5e1;"><span style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">Summary</span><br/>${escape(summary)}</p>` : ""}`,
    cta: { label: "Open the obligation →", url },
  });
  const push: PushPayload = {
    title: `Evidence OK · ${reg?.citation ?? "Obligation"}`,
    body: "No discrepancies flagged",
    url: `/regwatch/obligations/${o.id}`,
    severity: "low",
  };
  return { subject, html, push };
}

function renderEvidenceAnalysisFlaggedDiscrepancy(
  input: RenderInput,
): RenderedNotification | null {
  const o = input.subjects.obligation;
  if (!o) return null;
  const reg = input.subjects.reg;
  const fileName = stringFromPayload(input.payload.file_name);
  const summary = stringFromPayload(input.payload.summary);
  const overallSignal = stringFromPayload(input.payload.overall_signal);
  const findingsCountRaw = input.payload.findings_count;
  const findingsCount =
    typeof findingsCountRaw === "number" ? findingsCountRaw : 0;
  const plural = findingsCount === 1 ? "discrepancy" : "discrepancies";
  const subject = `[Discrepancy] ${fileName ? fileName : "Evidence"} — ${findingsCount} ${plural} flagged`;
  const url = `${input.baseUrl}/regwatch/obligations/${o.id}`;
  const html = layout({
    hello: helloLine(input.recipientName),
    orgName: input.orgName,
    eyebrow: "Evidence discrepancy",
    headline: `${findingsCount} ${plural} flagged on ${escape(fileName ?? "your evidence")}`,
    body: `<p>The AI analysis of your evidence ${reg ? `against <strong>${escape(reg.citation)}</strong>` : ""} flagged ${findingsCount} potential ${plural}${overallSignal ? ` (overall read: <strong>${escape(overallSignal.replace("-", " "))}</strong>)` : ""}. Open the obligation to review each finding, address them, or acknowledge them before submitting for sign-off.</p>${summary ? `<p style="margin-top:12px;padding:8px;border-left:3px solid #fcd34d;background:#0b1220;color:#cbd5e1;"><span style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8;">AI summary</span><br/>${escape(summary)}</p>` : ""}`,
    cta: { label: "Review the findings →", url },
  });
  const push: PushPayload = {
    title: `${findingsCount} ${plural} · ${reg?.citation ?? "Obligation"}`,
    body: summary ? summary.slice(0, 100) : "Review AI findings",
    url: `/regwatch/obligations/${o.id}`,
    severity: "high",
  };
  return { subject, html, push };
}

function stringFromPayload(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

// ---------------------------------------------------------------------------
// Shared HTML layout — mirrors the critical-alerts email styling for visual
// consistency across all RegWatch notifications.
// ---------------------------------------------------------------------------
function layout(opts: {
  hello: string;
  orgName: string;
  eyebrow: string;
  headline: string;
  body: string;
  cta: { label: string; url: string };
}): string {
  return `<!doctype html>
<html><body style="margin:0;background:#0B1220;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#E5E7EB;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <p style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#00D4C4;margin:0;">${escape(opts.eyebrow)} · ${escape(opts.orgName)}</p>
    <h1 style="margin:8px 0 12px 0;font-size:20px;font-weight:600;line-height:1.3;color:#FFFFFF;">${opts.headline}</h1>
    <div style="font-size:14px;line-height:1.55;color:#CBD5E1;">${opts.body}</div>
    <div style="margin:24px 0 8px 0;">
      <a href="${opts.cta.url}" style="display:inline-block;background:#0EA5E9;color:#FFFFFF;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px;font-weight:500;">${escape(opts.cta.label)}</a>
    </div>
    <hr style="border:none;border-top:1px solid #1F2937;margin:24px 0 16px 0;"/>
    <p style="font-size:11px;color:#64748B;margin:0;">${opts.hello} You're receiving this because you have an active role on a compliance obligation in RegWatch. Adjust cadence in <a href="${escape(process.env.NEXT_PUBLIC_SITE_URL ?? "https://intelle.io")}/regwatch/settings/alerts" style="color:#94A3B8;">Alert preferences</a>.</p>
  </div>
</body></html>`;
}

function helloLine(name: string | null): string {
  return name ? `Hi ${escape(name)},` : "Hi,";
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
