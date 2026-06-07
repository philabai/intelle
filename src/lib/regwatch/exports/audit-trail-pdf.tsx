import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

import type {
  ReviewAssignment,
  SignatureRow,
  AuditEvent,
} from "@/lib/regwatch/internal-document-review";

/**
 * Server-side audit-trail PDF generator. Mirrors the look of
 * `pm-to-pdf.tsx` (same Helvetica, same margins) so the audit export
 * sits beside the doc PDF in evidence packs without a styling clash.
 *
 * Renders three sections per Part 11 expectations:
 *   1) Header — doc identification + state + generated-at watermark
 *   2) Signature manifest — every e-signature in chronological order
 *      with meaning, signer, timestamp, IP. This is the page auditors
 *      open first.
 *   3) Event log — every audit event with actor, reason for change,
 *      and payload-derived context.
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: 60,
    paddingBottom: 72,
    paddingHorizontal: 60,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#888",
    borderStyle: "solid",
    paddingBottom: 10,
  },
  kicker: {
    fontSize: 8,
    color: "#555",
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  meta: { fontSize: 9, color: "#444" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
    color: "#1a3a5a",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.4,
    borderBottomColor: "#ddd",
    borderStyle: "solid",
  },
  rowHeader: {
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f3f3f3",
    borderBottomColor: "#aaa",
  },
  cell: { paddingHorizontal: 4 },
  c1: { width: "18%" },
  c2: { width: "22%" },
  c3: { width: "30%" },
  c4: { width: "30%" },
  cTs: { width: "22%" },
  cActor: { width: "22%" },
  cEvent: { width: "20%" },
  cReason: { width: "36%" },
  empty: { color: "#888", fontStyle: "italic", marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 36,
    left: 60,
    right: 60,
    fontSize: 7.5,
    color: "#777",
    textAlign: "center",
  },
});

const EVENT_LABEL: Record<string, string> = {
  created: "Created",
  updated_metadata: "Metadata updated",
  revision_saved: "Revision saved",
  revision_committed: "Revision committed",
  uploaded_file: "File uploaded",
  submitted_for_review: "Submitted for review",
  reviewer_assigned: "Reviewer assigned",
  approver_assigned: "Approver assigned",
  reviewer_completed: "Review approved",
  changes_requested: "Changes requested",
  approved: "Approval signed",
  marked_effective: "Marked effective",
  superseded: "Superseded",
  retired: "Retired",
  comment_added: "Comment added",
  comment_resolved: "Comment resolved",
  citation_inserted: "Citation inserted",
  citation_flagged_stale: "Citation flagged stale",
};

const SIG_MEANING_LABEL: Record<SignatureRow["meaning"], string> = {
  authored: "Authored",
  reviewed: "Reviewed",
  approved: "Approved",
};

function isoToHuman(iso: string): string {
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return iso;
  }
}

export interface AuditTrailPdfData {
  docTitle: string;
  docInternalCode: string | null;
  docVersion: string | null;
  reviewState: string;
  ownerDisplayName: string | null;
  organizationName: string;
  generatedAt: string;
  generatedByDisplayName: string;
  assignments: ReviewAssignment[];
  signatures: SignatureRow[];
  auditEvents: AuditEvent[];
}

export async function auditTrailToPdfBuffer(
  data: AuditTrailPdfData,
): Promise<Buffer> {
  const sigsAsc = [...data.signatures].sort((a, b) =>
    a.signedAt.localeCompare(b.signedAt),
  );
  const eventsAsc = [...data.auditEvents].sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt),
  );

  const doc = (
    <Document
      title={`${data.docTitle} — Audit Trail`}
      author={data.organizationName}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.kicker}>21 CFR Part 11 · Audit Trail</Text>
          <Text style={styles.title}>{data.docTitle}</Text>
          <Text style={styles.meta}>
            {[
              data.docInternalCode,
              data.docVersion ? `v${data.docVersion}` : null,
              `State: ${data.reviewState}`,
              data.ownerDisplayName ? `Owner: ${data.ownerDisplayName}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Text style={[styles.meta, { marginTop: 2 }]}>
            Organization: {data.organizationName} · Generated{" "}
            {isoToHuman(data.generatedAt)} by {data.generatedByDisplayName}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Signature manifest ({sigsAsc.length})
        </Text>
        {sigsAsc.length === 0 ? (
          <Text style={styles.empty}>No e-signatures captured.</Text>
        ) : (
          <View>
            <View style={[styles.row, styles.rowHeader]}>
              <Text style={[styles.cell, styles.c1]}>Meaning</Text>
              <Text style={[styles.cell, styles.c2]}>Signer</Text>
              <Text style={[styles.cell, styles.c3]}>Timestamp (UTC)</Text>
              <Text style={[styles.cell, styles.c4]}>Forensics</Text>
            </View>
            {sigsAsc.map((s) => (
              <View key={s.id} style={styles.row} wrap={false}>
                <Text style={[styles.cell, styles.c1]}>
                  {SIG_MEANING_LABEL[s.meaning]}
                </Text>
                <Text style={[styles.cell, styles.c2]}>
                  {s.signerDisplayName}
                  {s.signerEmail ? `\n${s.signerEmail}` : ""}
                </Text>
                <Text style={[styles.cell, styles.c3]}>
                  {isoToHuman(s.signedAt)}
                </Text>
                <Text style={[styles.cell, styles.c4]}>
                  {s.ipAddress ?? "—"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>
          Event log ({eventsAsc.length})
        </Text>
        {eventsAsc.length === 0 ? (
          <Text style={styles.empty}>No audit events captured.</Text>
        ) : (
          <View>
            <View style={[styles.row, styles.rowHeader]}>
              <Text style={[styles.cell, styles.cTs]}>Timestamp (UTC)</Text>
              <Text style={[styles.cell, styles.cEvent]}>Event</Text>
              <Text style={[styles.cell, styles.cActor]}>Actor</Text>
              <Text style={[styles.cell, styles.cReason]}>
                Reason / context
              </Text>
            </View>
            {eventsAsc.map((e) => {
              const reason =
                (e.payload?.reasonForChange as string | undefined) ?? "";
              const fromTo =
                e.payload?.fromState && e.payload?.toState
                  ? ` (${e.payload.fromState as string} → ${e.payload.toState as string})`
                  : "";
              return (
                <View key={e.id} style={styles.row} wrap={false}>
                  <Text style={[styles.cell, styles.cTs]}>
                    {isoToHuman(e.occurredAt)}
                  </Text>
                  <Text style={[styles.cell, styles.cEvent]}>
                    {EVENT_LABEL[e.eventType] ?? e.eventType}
                    {fromTo}
                  </Text>
                  <Text style={[styles.cell, styles.cActor]}>
                    {e.actorDisplayName}
                  </Text>
                  <Text style={[styles.cell, styles.cReason]}>
                    {reason || "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${data.docTitle} · Audit Trail · Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
