import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import type { ObligationReviewStatus } from "./obligations";

export interface StateHistoryEntry {
  id: string;
  obligationId: string;
  fromStatus: ObligationReviewStatus | null;
  toStatus: ObligationReviewStatus;
  actorUserId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function listObligationStateHistory(
  obligationId: string,
): Promise<StateHistoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obligation_state_history")
    .select(
      "id, obligation_id, from_status, to_status, actor_user_id, notes, metadata, created_at",
    )
    .eq("obligation_id", obligationId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  const svc = createServiceClient();
  const actorIds = Array.from(
    new Set(
      data
        .map((r) => r.actor_user_id as string | null)
        .filter((x): x is string => Boolean(x)),
    ),
  );
  const actorById = new Map<string, { email: string | null; name: string | null }>();
  for (const id of actorIds) {
    try {
      const { data: u } = await svc.auth.admin.getUserById(id);
      if (u.user) {
        actorById.set(id, {
          email: u.user.email ?? null,
          name: (u.user.user_metadata?.full_name as string | undefined) ?? null,
        });
      }
    } catch {
      // best-effort
    }
  }

  return data.map((r) => {
    const actor = r.actor_user_id
      ? actorById.get(r.actor_user_id as string)
      : undefined;
    return {
      id: r.id as string,
      obligationId: r.obligation_id as string,
      fromStatus: (r.from_status as ObligationReviewStatus | null) ?? null,
      toStatus: r.to_status as ObligationReviewStatus,
      actorUserId: (r.actor_user_id as string | null) ?? null,
      actorEmail: actor?.email ?? null,
      actorName: actor?.name ?? null,
      notes: (r.notes as string | null) ?? null,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      createdAt: r.created_at as string,
    };
  });
}
