"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "./supabase/server";

/**
 * Server actions for the Footprint Configurator. Called directly from the
 * client FootprintForm — no API route required. RLS enforces that mutations
 * only touch rows the caller's org owns.
 */

const cas = z.string().regex(/^\d{1,7}-\d{2}-\d$/, "Invalid CAS number format");

const saveFootprintSchema = z.object({
  geographies: z.array(z.string().max(8)).max(80),
  activities_naics: z.array(z.string().regex(/^\d{2,6}$/, "Invalid NAICS code")).max(80),
  substances_cas: z.array(cas).max(200),
  monitored_regulator_slugs: z.array(z.string().max(64)).max(120),
  monitored_topics: z.array(z.string().max(48)).max(40),
});

export type SaveFootprintInput = z.infer<typeof saveFootprintSchema>;

export interface SaveFootprintResult {
  ok: boolean;
  error?: string;
}

export async function saveFootprint(input: unknown): Promise<SaveFootprintResult> {
  const parsed = saveFootprintSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Not authenticated" };
  }

  // Find the user's footprint via their org membership (RLS handles isolation).
  const { data: footprint, error: lookupError } = await supabase
    .from("operations_footprints")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[regwatch] saveFootprint lookup error:", lookupError);
    return { ok: false, error: "Could not find your footprint" };
  }
  if (!footprint) {
    return {
      ok: false,
      error: "No footprint provisioned for your account — contact support",
    };
  }

  const { error: updateError } = await supabase
    .from("operations_footprints")
    .update({
      geographies: parsed.data.geographies,
      activities_naics: parsed.data.activities_naics,
      substances_cas: parsed.data.substances_cas,
      monitored_regulator_slugs: parsed.data.monitored_regulator_slugs,
      monitored_topics: parsed.data.monitored_topics,
      is_configured: true,
      configured_at: new Date().toISOString(),
    })
    .eq("id", footprint.id);

  if (updateError) {
    console.error("[regwatch] saveFootprint update error:", updateError);
    return { ok: false, error: updateError.message };
  }

  revalidatePath("/regwatch/settings/footprint");
  revalidatePath("/regwatch/onboarding");
  revalidatePath("/regwatch/feed");
  return { ok: true };
}

const updateRoleSchema = z.object({
  functional_role: z.string().max(40),
});

export async function updateMyRole(input: unknown): Promise<SaveFootprintResult> {
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid role" };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { functional_role: parsed.data.functional_role },
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

const regulatorListSchema = z.array(
  z.object({ slug: z.string(), name: z.string(), short_name: z.string().nullable() }),
);

export async function listMonitorableRegulators(): Promise<
  z.infer<typeof regulatorListSchema>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("regulators")
    .select("slug, name, short_name, jurisdiction_code, region")
    .eq("is_active", true)
    .order("jurisdiction_code", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[regwatch] listMonitorableRegulators error:", error);
    return [];
  }
  return (data ?? []) as z.infer<typeof regulatorListSchema>;
}
