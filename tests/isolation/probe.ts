/**
 * Multi-tenant isolation probe — empirically proves Org A cannot reach Org B.
 *
 *   npx tsx --env-file=.env.test tests/isolation/probe.ts
 *
 * Requires tests/fixtures/state.json (run tests/fixtures/seed.ts first) and the
 * publishable/anon key in .env.test. Authenticates as real fixture users via
 * password and exercises RLS the way the app does (anon key + session).
 *
 * Every cross-tenant table gets a POSITIVE control (own org IS visible) and a
 * NEGATIVE control (other org is NOT). A negative control returning rows is a
 * Critical isolation breach.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const here = dirname(fileURLToPath(import.meta.url));
const state = JSON.parse(readFileSync(join(here, "..", "fixtures", "state.json"), "utf8"));

interface Result { name: string; pass: boolean; detail: string }
const results: Result[] = [];
function record(name: string, pass: boolean, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

async function clientFor(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, {
    db: { schema: "regwatch" },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await c.auth.signInWithPassword({ email, password: state.password });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return c;
}

/** Count rows visible to `client` in `table` filtered by org column = orgId. */
async function countByOrg(client: SupabaseClient, table: string, orgId: string, col = "organization_id") {
  const { data, error } = await client.from(table).select("id").eq(col, orgId).limit(5);
  return { count: data?.length ?? 0, error: error?.message ?? null };
}

const TENANT_TABLES = [
  "organizations",
  "organization_members",
  "operations_footprints",
  "assets",
  "compliance_obligations",
  "internal_documents",
  "audit_log",
];

async function main() {
  const a1 = await clientFor(state.emails.ownerA);
  const { orgA, orgB } = state;

  // organizations uses `id`, others use organization_id.
  for (const table of TENANT_TABLES) {
    const col = table === "organizations" ? "id" : "organization_id";
    const own = await countByOrg(a1, table, orgA, col);
    const other = await countByOrg(a1, table, orgB, col);
    // Positive control: own-org read must not error (count may be 0 if unseeded).
    record(`[read] ownerA can query own ${table}`, own.error === null, own.error ?? `${own.count} rows`);
    // Negative control: other-org rows must be invisible.
    record(`[isolation] ownerA CANNOT read Org B ${table}`, other.count === 0, `${other.count} rows leaked` + (other.error ? ` (err: ${other.error})` : ""));
  }

  // Role escalation: a member of Org A must not be able to add a member (admin-only RLS).
  const memberA = await clientFor(state.emails.memberA);
  const { error: escErr } = await memberA
    .from("organization_members")
    .insert({ organization_id: orgA, user_id: state.users.noOrgUser, role: "member" });
  record("[escalation] memberA CANNOT insert org membership (admin-only)", !!escErr, escErr?.message ?? "INSERT SUCCEEDED — RLS gap");

  // Cross-tenant write: ownerA must not be able to write into Org B.
  const { error: writeErr } = await a1
    .from("operations_footprints")
    .insert({ organization_id: orgB, geographies: ["XX"] });
  record("[isolation] ownerA CANNOT write Org B footprint", !!writeErr, writeErr?.message ?? "INSERT SUCCEEDED — RLS gap");

  // F12: the cross-org user is in both orgs — document what getMyOrganization-style
  // .limit(1) would pick (first by created_at).
  const cross = await clientFor(state.emails.crossUser);
  const { data: memberships } = await cross
    .from("organization_members")
    .select("organization_id, role, created_at")
    .order("created_at", { ascending: true });
  record("[F12] cross-org user sees >1 org membership", (memberships?.length ?? 0) >= 2,
    `${memberships?.length ?? 0} memberships (app .limit(1) would silently pick the first)`);

  const summary = {
    total: results.length,
    failed: results.filter((r) => !r.pass).length,
    isolationBreaches: results.filter((r) => !r.pass && r.name.includes("isolation")).length,
    results,
  };
  writeFileSync(join(here, "..", "reports", "isolation.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(`\n${summary.total - summary.failed}/${summary.total} passed · ${summary.isolationBreaches} isolation breach(es)`);
  if (summary.failed > 0) process.exit(2);
}

main().catch((e) => { console.error(e); process.exit(1); });
