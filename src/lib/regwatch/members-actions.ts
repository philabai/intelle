"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { getMyMembership, isAdminRole, type AdminRole } from "./members";

/**
 * Member-management server actions. Only owners/admins of the calling user's
 * org can mutate membership. The action performs the role check before any
 * write — RLS would catch unauthorized writes but we want a clean error
 * message.
 */

const addByEmailSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

const updateRoleSchema = z.object({
  membershipId: z.string().uuid(),
  role: z.enum(["owner", "admin", "member"]),
});

const removeSchema = z.object({
  membershipId: z.string().uuid(),
});

export interface MemberActionResult {
  ok: boolean;
  error?: string;
}

async function ensureAdmin(): Promise<
  | { ok: true; organizationId: string; userId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const membership = await getMyMembership();
  if (!membership) return { ok: false, error: "No organization" };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { ok: false, error: "Only owners and admins can manage members" };
  }
  return { ok: true, organizationId: membership.organizationId, userId: user.id };
}

/**
 * Add an existing user to the calling user's org by their email. We do NOT
 * send invitation emails in v1 — the invitee must already have an intelle.io
 * account. A future slice can add Supabase's inviteUserByEmail flow.
 *
 * Defensive: checks if the membership already exists and returns a clean
 * "already a member" error rather than a constraint violation.
 */
export async function addMemberByEmail(
  input: unknown,
): Promise<MemberActionResult> {
  const parsed = addByEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const svc = createServiceClient();

  // Find the target user by email (auth admin API).
  const { data: list, error: listErr } = await svc.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) return { ok: false, error: listErr.message };
  const target = list.users.find(
    (u) => (u.email ?? "").toLowerCase() === parsed.data.email.toLowerCase(),
  );
  if (!target) {
    return {
      ok: false,
      error: `No intelle.io account found for ${parsed.data.email}. They must sign up first; we'll add Supabase invite emails in a later release.`,
    };
  }

  // Already in this org?
  const { data: existing } = await svc
    .from("organization_members")
    .select("id")
    .eq("organization_id", auth.organizationId)
    .eq("user_id", target.id)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "That account is already a member of your org" };
  }

  const { error: insErr } = await svc.from("organization_members").insert({
    organization_id: auth.organizationId,
    user_id: target.id,
    role: parsed.data.role,
  });
  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath("/regwatch/settings/members");
  return { ok: true };
}

export async function updateMemberRole(
  input: unknown,
): Promise<MemberActionResult> {
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: target, error: targetErr } = await supabase
    .from("organization_members")
    .select("id, user_id, role")
    .eq("id", parsed.data.membershipId)
    .maybeSingle();
  if (targetErr || !target) {
    return { ok: false, error: "Member not found" };
  }

  // Prevent demoting the last owner — orgs always need an owner.
  if (
    (target.role as string) === "owner" &&
    parsed.data.role !== "owner"
  ) {
    const svc = createServiceClient();
    const { count } = await svc
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", auth.organizationId)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        error:
          "Can't demote the last owner — promote another member to owner first",
      };
    }
  }

  const svc = createServiceClient();
  const { error } = await svc
    .from("organization_members")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.membershipId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/regwatch/settings/members");
  return { ok: true };
}

export async function removeMember(
  input: unknown,
): Promise<MemberActionResult> {
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("organization_members")
    .select("id, user_id, role")
    .eq("id", parsed.data.membershipId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Member not found" };

  if (target.user_id === auth.userId) {
    return {
      ok: false,
      error:
        "You can't remove yourself. Have another owner remove you, or transfer ownership first.",
    };
  }
  if ((target.role as string) === "owner") {
    const svc = createServiceClient();
    const { count } = await svc
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", auth.organizationId)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "Can't remove the last owner" };
    }
  }

  const svc = createServiceClient();
  const { error } = await svc
    .from("organization_members")
    .delete()
    .eq("id", parsed.data.membershipId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/regwatch/settings/members");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Assignment — assign / unassign a footprint_matches row to a teammate
// ---------------------------------------------------------------------------

const assignSchema = z.object({
  matchId: z.string().uuid(),
  assigneeUserId: z.string().uuid().nullable(),
});

export async function assignMatch(input: unknown): Promise<MemberActionResult> {
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Validate that the assignee (if any) is in the calling user's org.
  if (parsed.data.assigneeUserId) {
    const { data: peer } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", parsed.data.assigneeUserId)
      .maybeSingle();
    if (!peer) {
      return { ok: false, error: "Assignee isn't a member of your org" };
    }
  }

  const { error } = await supabase
    .from("footprint_matches")
    .update({ assigned_to: parsed.data.assigneeUserId })
    .eq("id", parsed.data.matchId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/regwatch/feed");
  return { ok: true };
}

export { isAdminRole, type AdminRole };
