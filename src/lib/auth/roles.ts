import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "content_admin" | "researcher" | "customer";

export type SessionUser = {
  id: string;
  email: string | null;
  role: Role | null;
};

/**
 * Returns the authed user with their role, or null if unauthenticated.
 * Role is read from `auth.users.raw_app_meta_data.role` (set via Supabase admin SQL).
 *
 * Deny-by-default: a user with NO explicit platform role gets `role: null`, which
 * fails every `isAdminLike` / `canManageContent` check. The platform admin's
 * account MUST have `app_metadata.role = 'admin'` set in Supabase. (Previously
 * this defaulted to 'admin', which let any authenticated regwatch tenant user
 * reach the consulting back-office + its admin-only API routes.)
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role =
    ((user.app_metadata as Record<string, unknown> | undefined)?.role as Role | undefined) ??
    null;
  return { id: user.id, email: user.email ?? null, role };
}

export function canManageContent(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "admin" || user.role === "content_admin";
}
