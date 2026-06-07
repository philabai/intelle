import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";

/**
 * Reviewer Inbox aggregator — surfaces every doc review + obligation
 * review awaiting the current user across the org, in one ranked list.
 *
 * Sourced from three signals:
 *   1. internal_document_review_assignments where user_id = me and
 *      completed_at IS NULL (doc reviews / approvals waiting on me).
 *   2. compliance_obligations where assigned_reviewer_user_id = me
 *      and review_status is open-ish (open / awaiting-triage /
 *      in-review / pending-approval).
 *
 * Capped per source to keep the query cheap (200 rows each). Pagination
 * comes later if it ever matters.
 */

export interface InboxItem {
  kind: "doc-review" | "obligation-review";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  /** State pill label, e.g. "in_review" / "pending-approval" */
  state: string;
  /** ISO timestamp used for sort + display. */
  dueAt: string | null;
  assignedAt: string;
}

export interface InboxBundle {
  docReviews: InboxItem[];
  obligationReviews: InboxItem[];
  total: number;
}

export async function getReviewerInbox(): Promise<InboxBundle> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { docReviews: [], obligationReviews: [], total: 0 };

  const svc = createServiceClient();

  const [{ data: docRows }, { data: obligationRows }] = await Promise.all([
    svc
      .from("internal_document_review_assignments")
      .select(
        `id, internal_document_id, role, assigned_at, completed_at,
         internal_documents!inner ( id, title, review_state )`,
      )
      .eq("user_id", user.id)
      .is("completed_at", null)
      .order("assigned_at", { ascending: false })
      .limit(200),
    svc
      .from("compliance_obligations")
      .select(
        `id, regulatory_item_id, asset_id, review_status, review_due_at, updated_at,
         regulatory_items!compliance_obligations_regulatory_item_id_fkey
          ( id, citation, title ),
         assets!compliance_obligations_asset_id_fkey
          ( id, name )`,
      )
      .eq("assigned_reviewer_user_id", user.id)
      .in("review_status", [
        "open",
        "awaiting-triage",
        "in-review",
        "pending-approval",
      ])
      .order("review_due_at", { ascending: true, nullsFirst: false })
      .limit(200),
  ]);

  const docReviews: InboxItem[] = (docRows ?? []).map((r) => {
    const doc = Array.isArray(r.internal_documents)
      ? r.internal_documents[0]
      : (r.internal_documents as { id: string; title: string; review_state: string } | null);
    return {
      kind: "doc-review" as const,
      id: r.id as string,
      title: doc?.title ?? "Untitled document",
      subtitle: `${r.role} · ${doc?.review_state ?? "—"}`,
      href: `/regwatch/documents/${r.internal_document_id}`,
      state: doc?.review_state ?? "—",
      dueAt: null,
      assignedAt: r.assigned_at as string,
    };
  });

  const obligationReviews: InboxItem[] = (obligationRows ?? []).map((r) => {
    const reg = Array.isArray(r.regulatory_items)
      ? r.regulatory_items[0]
      : (r.regulatory_items as { id: string; citation: string; title: string } | null);
    const asset = Array.isArray(r.assets)
      ? r.assets[0]
      : (r.assets as { id: string; name: string } | null);
    return {
      kind: "obligation-review" as const,
      id: r.id as string,
      title: reg?.title ?? "Untitled regulation",
      subtitle: `${reg?.citation ?? "—"} · ${asset?.name ?? "—"}`,
      href: `/regwatch/obligations/${r.id}`,
      state: r.review_status as string,
      dueAt: (r.review_due_at as string | null) ?? null,
      assignedAt: r.updated_at as string,
    };
  });

  return {
    docReviews,
    obligationReviews,
    total: docReviews.length + obligationReviews.length,
  };
}
