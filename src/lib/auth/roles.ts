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
 * Until customer roles are populated, treat any authed user as 'admin' so the existing
 * single-user setup keeps working.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role =
    ((user.app_metadata as Record<string, unknown> | undefined)?.role as Role | undefined) ??
    "admin";
  return { id: user.id, email: user.email ?? null, role };
}

export function canManageContent(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "admin" || user.role === "content_admin";
}
