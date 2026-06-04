import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client scoped to the `regwatch` schema.
 *
 * Use for ingest pipelines, cron jobs, and any operation that must bypass RLS
 * (e.g. writing footprint_matches and impact_briefings on behalf of users).
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "regwatch" },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
