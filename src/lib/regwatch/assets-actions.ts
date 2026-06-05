"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { getMyMembership } from "./members";
import { checkFeatureGate } from "./tier";
import { getStarterPack, type StarterPackId } from "./asset-starter-packs";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function ensureAssetAdmin(): Promise<
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
    return { ok: false, error: "Only owners and admins can edit the asset tree" };
  }
  const gate = await checkFeatureGate("compliance_obligations");
  if (!gate.allowed) {
    return {
      ok: false,
      error: `Asset management requires the ${gate.requiredTier} plan. You are on ${gate.currentTier}.`,
    };
  }
  return { ok: true, organizationId: membership.organizationId, userId: user.id };
}

// ---------------------------------------------------------------------------
// Hierarchy config
// ---------------------------------------------------------------------------

const hierarchyConfigSchema = z.object({
  level2Label: z.string().trim().min(1).max(40),
  level3Label: z.string().trim().min(1).max(40),
  level4Label: z.string().trim().min(1).max(40),
  level5Label: z.string().trim().min(1).max(40),
  level6Enabled: z.boolean(),
  level6Label: z.string().trim().min(1).max(40).nullable(),
  starterPack: z.string().nullable(),
});

export async function upsertHierarchyConfig(
  input: unknown,
): Promise<ActionResult> {
  const parsed = hierarchyConfigSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const auth = await ensureAssetAdmin();
  if (!auth.ok) return auth;

  const svc = createServiceClient();
  const { error } = await svc
    .from("asset_hierarchy_config")
    .upsert(
      {
        organization_id: auth.organizationId,
        level_2_label: parsed.data.level2Label,
        level_3_label: parsed.data.level3Label,
        level_4_label: parsed.data.level4Label,
        level_5_label: parsed.data.level5Label,
        level_6_enabled: parsed.data.level6Enabled,
        level_6_label: parsed.data.level6Label,
        starter_pack: parsed.data.starterPack,
      },
      { onConflict: "organization_id" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/assets");
  revalidatePath("/regwatch/assets/setup");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Assets CRUD
// ---------------------------------------------------------------------------

const createAssetSchema = z.object({
  parentId: z.string().uuid().nullable(),
  level: z.number().int().min(2).max(6),
  name: z.string().trim().min(1).max(200),
  code: z.string().trim().max(80).nullable().optional(),
  assetType: z.string().trim().max(80).nullable().optional(),
  jurisdictionCode: z.string().trim().max(8).nullable().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
});

export async function createAsset(input: unknown): Promise<ActionResult> {
  const parsed = createAssetSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const auth = await ensureAssetAdmin();
  if (!auth.ok) return auth;

  // Sanity: if parentId is set, ensure it's in the caller's org and its
  // level + 1 matches. Cheap check that prevents foot-guns from API misuse.
  if (parsed.data.parentId) {
    const svc = createServiceClient();
    const { data: parent } = await svc
      .from("assets")
      .select("organization_id, level")
      .eq("id", parsed.data.parentId)
      .maybeSingle();
    if (!parent || parent.organization_id !== auth.organizationId) {
      return { ok: false, error: "Parent asset not found in your org" };
    }
    if ((parent.level as number) + 1 !== parsed.data.level) {
      return {
        ok: false,
        error: `Level ${parsed.data.level} must be parented under level ${parsed.data.level - 1}, not level ${parent.level}`,
      };
    }
  } else if (parsed.data.level !== 2) {
    return { ok: false, error: "Only L2 (Site) nodes can have no parent" };
  }

  const svc = createServiceClient();
  const { data, error } = await svc
    .from("assets")
    .insert({
      organization_id: auth.organizationId,
      parent_id: parsed.data.parentId,
      level: parsed.data.level,
      name: parsed.data.name,
      code: parsed.data.code ?? null,
      asset_type: parsed.data.assetType ?? null,
      jurisdiction_code: parsed.data.jurisdictionCode ?? null,
      tags: parsed.data.tags ?? [],
      created_by: auth.userId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/assets");
  revalidatePath("/regwatch/assets/setup");
  return { ok: true, id: data?.id as string };
}

const updateAssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().max(80).nullable().optional(),
  assetType: z.string().trim().max(80).nullable().optional(),
  jurisdictionCode: z.string().trim().max(8).nullable().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export async function updateAsset(input: unknown): Promise<ActionResult> {
  const parsed = updateAssetSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const auth = await ensureAssetAdmin();
  if (!auth.ok) return auth;

  const svc = createServiceClient();
  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.code !== undefined) patch.code = parsed.data.code;
  if (parsed.data.assetType !== undefined) patch.asset_type = parsed.data.assetType;
  if (parsed.data.jurisdictionCode !== undefined)
    patch.jurisdiction_code = parsed.data.jurisdictionCode;
  if (parsed.data.tags !== undefined) patch.tags = parsed.data.tags;
  if (parsed.data.parentId !== undefined) patch.parent_id = parsed.data.parentId;

  const { error } = await svc
    .from("assets")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("organization_id", auth.organizationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/assets");
  revalidatePath("/regwatch/assets/setup");
  return { ok: true, id: parsed.data.id };
}

const archiveAssetSchema = z.object({ id: z.string().uuid() });

export async function archiveAsset(input: unknown): Promise<ActionResult> {
  const parsed = archiveAssetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const auth = await ensureAssetAdmin();
  if (!auth.ok) return auth;
  const svc = createServiceClient();
  const { error } = await svc
    .from("assets")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("organization_id", auth.organizationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/regwatch/assets");
  revalidatePath("/regwatch/assets/setup");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Starter pack seeding
// ---------------------------------------------------------------------------

const seedStarterPackSchema = z.object({
  starterPack: z.enum(["iso-14224", "rds-pp", "gmdn", "ata-100", "isa-95"]),
  siteIds: z.array(z.string().uuid()).min(1).max(20),
});

/**
 * Seeds the L3 + L4 nodes from a starter pack under each provided Site (L2).
 * Idempotent at the (parent, code, level) key — re-running adds nothing new.
 */
export async function seedStarterPack(input: unknown): Promise<ActionResult> {
  const parsed = seedStarterPackSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const auth = await ensureAssetAdmin();
  if (!auth.ok) return auth;

  const pack = getStarterPack(parsed.data.starterPack as StarterPackId);
  const svc = createServiceClient();

  // Validate every site belongs to the caller's org and is L2.
  const { data: sites } = await svc
    .from("assets")
    .select("id, organization_id, level")
    .in("id", parsed.data.siteIds);
  for (const s of sites ?? []) {
    if (s.organization_id !== auth.organizationId || s.level !== 2) {
      return { ok: false, error: "One or more sites are not L2 nodes in your org" };
    }
  }

  for (const siteId of parsed.data.siteIds) {
    for (const area of pack.areas) {
      // Skip if this (site, code, level=3) area already exists.
      const { data: existingArea } = await svc
        .from("assets")
        .select("id")
        .eq("organization_id", auth.organizationId)
        .eq("parent_id", siteId)
        .eq("level", 3)
        .eq("code", area.code)
        .maybeSingle();
      let areaId = existingArea?.id as string | undefined;
      if (!areaId) {
        const { data: newArea, error: areaErr } = await svc
          .from("assets")
          .insert({
            organization_id: auth.organizationId,
            parent_id: siteId,
            level: 3,
            name: area.name,
            code: area.code,
            asset_type: pack.id,
            created_by: auth.userId,
          })
          .select("id")
          .single();
        if (areaErr) return { ok: false, error: areaErr.message };
        areaId = newArea.id as string;
      }

      for (const cls of area.asset_classes) {
        const { data: existingClass } = await svc
          .from("assets")
          .select("id")
          .eq("organization_id", auth.organizationId)
          .eq("parent_id", areaId)
          .eq("level", 4)
          .eq("code", cls.code)
          .maybeSingle();
        if (existingClass) continue;
        const { error: clsErr } = await svc.from("assets").insert({
          organization_id: auth.organizationId,
          parent_id: areaId,
          level: 4,
          name: cls.name,
          code: cls.code,
          asset_type: pack.id,
          created_by: auth.userId,
        });
        if (clsErr) return { ok: false, error: clsErr.message };
      }
    }
  }

  // Stamp the pack into the config so the UI shows which is active.
  await svc
    .from("asset_hierarchy_config")
    .upsert(
      {
        organization_id: auth.organizationId,
        starter_pack: parsed.data.starterPack,
      },
      { onConflict: "organization_id" },
    );

  revalidatePath("/regwatch/assets");
  revalidatePath("/regwatch/assets/setup");
  return { ok: true };
}
