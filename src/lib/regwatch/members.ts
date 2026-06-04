import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { roleLabel } from "./reference/roles";

/**
 * Members of the calling user's org. Read via SSR (RLS scopes to fellow org
 * members); the email lookup uses service-role since auth.users isn't visible
 * through RLS for anon/authenticated. Per A.3 we keep two separate "role"
 * concepts:
 *   - organization_members.role   admin authority: owner / admin / member
 *   - user_metadata.functional_role  Feed defaults: cco / ehs-manager / etc.
 * v1 of the Members UI exposes the admin role only. Functional role stays
 * on Footprint.
 */

export type AdminRole = "owner" | "admin" | "member";
const ALLOWED_ADMIN_ROLES = new Set<AdminRole>(["owner", "admin", "member"]);

export interface OrgMember {
  membershipId: string;
  userId: string;
  email: string | null;
  fullName: string | null;
  functionalRole: string | null;
  functionalRoleLabel: string;
  role: AdminRole;
  createdAt: string;
  isMe: boolean;
  isOwner: boolean;
}

export function isAdminRole(value: string): value is AdminRole {
  return ALLOWED_ADMIN_ROLES.has(value as AdminRole);
}

/**
 * Returns every member of the calling user's org. Auth-only.
 */
export async function listMyOrgMembers(): Promise<OrgMember[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: members, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .order("created_at", { ascending: true });

  if (error || !members) {
    console.error("[regwatch] listMyOrgMembers:", error);
    return [];
  }

  // Resolve emails via service-role (auth.users RLS would block this otherwise).
  const svc = createServiceClient();
  const enriched: OrgMember[] = [];
  for (const m of members) {
    let email: string | null = null;
    let fullName: string | null = null;
    let functionalRole: string | null = null;
    try {
      const { data: u } = await svc.auth.admin.getUserById(m.user_id as string);
      email = u.user?.email ?? null;
      fullName =
        (u.user?.user_metadata?.full_name as string | undefined) ?? null;
      functionalRole =
        (u.user?.user_metadata?.functional_role as string | undefined) ?? null;
    } catch (e) {
      console.error("[regwatch] auth.users lookup failed:", e);
    }
    const role = isAdminRole(m.role as string)
      ? (m.role as AdminRole)
      : "member";
    enriched.push({
      membershipId: m.id as string,
      userId: m.user_id as string,
      email,
      fullName,
      functionalRole,
      functionalRoleLabel: roleLabel(functionalRole),
      role,
      createdAt: m.created_at as string,
      isMe: m.user_id === user.id,
      isOwner: role === "owner",
    });
  }
  return enriched;
}

/**
 * Used to populate the AssigneeSelect dropdown in FeedRow — strips emails to
 * just what the dropdown needs.
 */
export async function listAssigneeOptions(): Promise<
  { userId: string; displayName: string }[]
> {
  const members = await listMyOrgMembers();
  return members.map((m) => ({
    userId: m.userId,
    displayName:
      m.fullName ??
      m.email ??
      (m.isMe ? "Me" : m.userId.slice(0, 8)),
  }));
}

export async function getMyMembership(): Promise<{
  organizationId: string;
  role: AdminRole;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    organizationId: data.organization_id as string,
    role: isAdminRole(data.role as string) ? (data.role as AdminRole) : "member",
  };
}
