import { createClient } from "./supabase/server";

/**
 * Footprint + organization read helpers used by the configurator and any
 * downstream surface (Feed, alerts) that needs to know what to match against.
 * All queries are org-scoped via RLS.
 */

export interface FootprintRecord {
  id: string;
  organization_id: string;
  name: string;
  geographies: string[];
  activities_naics: string[];
  monitored_regulator_slugs: string[];
  monitored_topics: string[];
  substances_cas: string[];
  is_configured: boolean;
  configured_at: string | null;
}

export interface OrgMembership {
  organization_id: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    tier: string;
  };
}

/**
 * Returns the org the calling user belongs to (most users belong to exactly
 * one — the auto-provisioned one). Returns null if the user has no membership
 * yet (e.g. trigger didn't fire), so callers can show a recoverable error.
 */
export async function getMyOrganization(): Promise<OrgMembership | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      `organization_id, role,
       organization:organizations!inner ( id, name, slug, tier )`,
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[regwatch] getMyOrganization error:", error);
    return null;
  }
  if (!data) return null;
  const org = Array.isArray(data.organization) ? data.organization[0] : data.organization;
  return { organization_id: data.organization_id, role: data.role, organization: org } as OrgMembership;
}

export async function getMyFootprint(): Promise<FootprintRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operations_footprints")
    .select(
      "id, organization_id, name, geographies, activities_naics, monitored_regulator_slugs, monitored_topics, substances_cas, is_configured, configured_at",
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[regwatch] getMyFootprint error:", error);
    return null;
  }
  return (data as FootprintRecord) ?? null;
}
