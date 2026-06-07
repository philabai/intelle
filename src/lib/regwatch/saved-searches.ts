import { createClient } from "./supabase/server";

/**
 * Read-side helpers for the saved-searches surface. List queries run
 * as the authenticated user so RLS enforces ownership (no service-role
 * leak).
 */

export interface SavedSearch {
  id: string;
  query: string;
  label: string | null;
  filters: Record<string, unknown>;
  resultCountAtSave: number | null;
  lastRunAt: string | null;
  createdAt: string;
}

export async function listMySavedSearches(): Promise<SavedSearch[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("saved_searches")
    .select(
      "id, query, label, filters, result_count_at_save, last_run_at, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id as string,
    query: r.query as string,
    label: (r.label as string | null) ?? null,
    filters: (r.filters as Record<string, unknown>) ?? {},
    resultCountAtSave: (r.result_count_at_save as number | null) ?? null,
    lastRunAt: (r.last_run_at as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
}

export async function isSavedQuery(query: string): Promise<boolean> {
  if (!query.trim()) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { count } = await supabase
    .from("saved_searches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("query", query.trim());
  return (count ?? 0) > 0;
}
