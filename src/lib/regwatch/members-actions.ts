"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { getMyMembership, isAdminRole, type AdminRole } from "./members";
import { checkFeatureGate, type GatedFeature } from "./tier";
import { recordAudit } from "./audit";

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

async function ensureAdmin(
  feature: GatedFeature = "members",
): Promise<
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
  const gate = await checkFeatureGate(feature);
  if (!gate.allowed) {
    return {
      ok: false,
      error: `This feature requires the ${gate.requiredTier} plan. You are on ${gate.currentTier}.`,
    };
  }
  return { ok: true, organizationId: membership.organizationId, userId: user.id };
}

/**
 * Add (or invite) a user to the calling user's org by their email.
 *
 * - If the email matches an existing intelle.io account, they are added to
 *   the org immediately (no email sent).
 * - If no account exists, we call Supabase admin `inviteUserByEmail`, which
 *   sends a magic-link signup email. We also write a `pending_invites` row so
 *   admins can see the pending invitation, and we stash
 *   `regwatch_invite_org_id` / `regwatch_invite_role` in the user metadata so
 *   the signup trigger joins the new user to this org (instead of creating a
 *   personal one). See migration 20260608_regwatch_pending_invites.sql.
 */
export async function addMemberByEmail(
  input: unknown,
): Promise<
  MemberActionResult & {
    /** Whether the email was sent (true) or the user was added directly (false). */
    invited?: boolean;
  }
> {
  const parsed = addByEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const svc = createServiceClient();
  const emailLower = parsed.data.email.toLowerCase();

  // Find the target user by email (auth admin API).
  const { data: list, error: listErr } = await svc.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) return { ok: false, error: listErr.message };
  const target = list.users.find(
    (u) => (u.email ?? "").toLowerCase() === emailLower,
  );

  if (target) {
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

    // F12 — single-org enforcement: a user belongs to exactly one org. Reject if
    // they already belong to a different one (a hard DB trigger backs this up).
    const { data: otherOrg } = await svc
      .from("organization_members")
      .select("id")
      .eq("user_id", target.id)
      .neq("organization_id", auth.organizationId)
      .limit(1)
      .maybeSingle();
    if (otherOrg) {
      return {
        ok: false,
        error: "That account already belongs to another organization and can't join a second one.",
      };
    }

    const { error: insErr } = await svc
      .from("organization_members")
      .insert({
        organization_id: auth.organizationId,
        user_id: target.id,
        role: parsed.data.role,
      });
    if (insErr) return { ok: false, error: insErr.message };

    await recordAudit({
      organizationId: auth.organizationId, userId: auth.userId,
      action: "member.added", entityType: "user", entityId: target.id,
      metadata: { email: emailLower, role: parsed.data.role },
    });
    revalidatePath("/regwatch/settings/members");
    return { ok: true, invited: false };
  }

  // ---- No account yet — send Supabase invite + record pending invite ------
  const { data: existingInvite } = await svc
    .from("pending_invites")
    .select("id")
    .eq("organization_id", auth.organizationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .ilike("email", emailLower)
    .maybeSingle();
  if (existingInvite) {
    return {
      ok: false,
      error: `${parsed.data.email} already has a pending invite. Resend or revoke it from the Members page.`,
    };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://intelle.io";

  const { error: inviteErr } = await svc.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: {
        regwatch_invite_org_id: auth.organizationId,
        regwatch_invite_role: parsed.data.role,
        regwatch_invited_by: auth.userId,
      },
      redirectTo: `${siteUrl}/regwatch/feed`,
    },
  );
  if (inviteErr) return { ok: false, error: inviteErr.message };

  const { error: pendingErr } = await svc
    .from("pending_invites")
    .insert({
      organization_id: auth.organizationId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: auth.userId,
    });
  if (pendingErr) return { ok: false, error: pendingErr.message };

  revalidatePath("/regwatch/settings/members");
  return { ok: true, invited: true };
}

// ---------------------------------------------------------------------------
// Pending invite management
// ---------------------------------------------------------------------------

const revokeInviteSchema = z.object({
  inviteId: z.string().uuid(),
});

export async function revokeInvite(
  input: unknown,
): Promise<MemberActionResult> {
  const parsed = revokeInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const svc = createServiceClient();
  const { error } = await svc
    .from("pending_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data.inviteId)
    .eq("organization_id", auth.organizationId)
    .is("accepted_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/regwatch/settings/members");
  return { ok: true };
}

export async function resendInvite(
  input: unknown,
): Promise<MemberActionResult> {
  const parsed = revokeInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const auth = await ensureAdmin();
  if (!auth.ok) return auth;

  const svc = createServiceClient();
  const { data: invite, error: invErr } = await svc
    .from("pending_invites")
    .select("email, role")
    .eq("id", parsed.data.inviteId)
    .eq("organization_id", auth.organizationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle();
  if (invErr || !invite) {
    return { ok: false, error: "Invite not found or already resolved" };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://intelle.io";

  const { error: sendErr } = await svc.auth.admin.inviteUserByEmail(
    invite.email,
    {
      data: {
        regwatch_invite_org_id: auth.organizationId,
        regwatch_invite_role: invite.role,
        regwatch_invited_by: auth.userId,
      },
      redirectTo: `${siteUrl}/regwatch/feed`,
    },
  );
  if (sendErr) return { ok: false, error: sendErr.message };

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

  await recordAudit({
    organizationId: auth.organizationId, userId: auth.userId,
    action: "member.role_changed", entityType: "user", entityId: target.user_id as string,
    metadata: { from: target.role, to: parsed.data.role },
  });
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

  await recordAudit({
    organizationId: auth.organizationId, userId: auth.userId,
    action: "member.removed", entityType: "user", entityId: target.user_id as string,
    metadata: { role: target.role },
  });
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

  const gate = await checkFeatureGate("assignment");
  if (!gate.allowed) {
    return {
      ok: false,
      error: `Match assignment requires the ${gate.requiredTier} plan. You are on ${gate.currentTier}.`,
    };
  }

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
