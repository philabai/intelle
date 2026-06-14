/**
 * Multi-tenant test fixtures for the QA isolation suite.
 *
 *   npx tsx --env-file=.env.test tests/fixtures/seed.ts
 *
 * Requires (in .env.test): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * and the `regwatch` schema exposed in the project's PostgREST settings.
 *
 * Creates a deterministic fixture set so isolation tests have a positive control
 * (A1 CAN see Org A) and a negative control (A1 CANNOT see Org B):
 *   Org A:  ownerA  (owner) · adminA (admin) · memberA (member)
 *   Org B:  ownerB  (owner)
 *   crossUser: member of BOTH Org A and Org B (exercises the F12 multi-org case)
 *   noOrgUser: authenticated but belongs to no org
 *   platformAdmin: app_metadata.role = 'admin' (consulting back-office)
 *
 * Idempotent: re-running deletes prior fixture users (by email) and recreates.
 * Writes the resulting ids to tests/fixtures/state.json for the probes to load.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.test");
  process.exit(1);
}

const PASSWORD = "QA-Test-Pw-2026!";
const EMAILS = {
  ownerA: "qa-owner-a@example.com",
  adminA: "qa-admin-a@example.com",
  memberA: "qa-member-a@example.com",
  ownerB: "qa-owner-b@example.com",
  crossUser: "qa-cross@example.com",
  noOrgUser: "qa-noorg@example.com",
  platformAdmin: "qa-platform-admin@example.com",
};

// Base client (auth.admin lives here; schema-agnostic).
const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
// regwatch-schema client for tenant tables.
const rw: SupabaseClient = createClient(URL, SERVICE, {
  db: { schema: "regwatch" },
  auth: { autoRefreshToken: false, persistSession: false },
});

async function deleteIfExists(email: string) {
  // admin.listUsers is paginated; small fixture set, scan first pages.
  for (let page = 1; page <= 5; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const u = data.users.find((x) => x.email === email);
    if (u) {
      await admin.auth.admin.deleteUser(u.id);
      return;
    }
    if (data.users.length < 200) break;
  }
}

async function createUser(email: string, appMeta?: Record<string, unknown>): Promise<string> {
  await deleteIfExists(email);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: appMeta,
  });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  return data.user.id;
}

/** The signup trigger auto-creates one org per user; return its id (owner row). */
async function ownedOrgId(userId: string): Promise<string> {
  // small retry — trigger runs on insert
  for (let i = 0; i < 10; i++) {
    const { data } = await rw
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .eq("role", "owner")
      .maybeSingle();
    if (data?.organization_id) return data.organization_id as string;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No auto-provisioned org for ${userId} — is the provisioning trigger installed?`);
}

async function addMembership(orgId: string, userId: string, role: "admin" | "member") {
  const { error } = await rw
    .from("organization_members")
    .insert({ organization_id: orgId, user_id: userId, role });
  if (error) throw new Error(`addMembership(${role}): ${error.message}`);
}

async function main() {
  console.log("Seeding fixtures against", URL);

  const ownerA = await createUser(EMAILS.ownerA);
  const orgA = await ownedOrgId(ownerA);
  const ownerB = await createUser(EMAILS.ownerB);
  const orgB = await ownedOrgId(ownerB);

  const adminA = await createUser(EMAILS.adminA);
  await addMembership(orgA, adminA, "admin");
  const memberA = await createUser(EMAILS.memberA);
  await addMembership(orgA, memberA, "member");

  const crossUser = await createUser(EMAILS.crossUser);
  await ownedOrgId(crossUser); // their own org
  await addMembership(orgA, crossUser, "member");
  await addMembership(orgB, crossUser, "member");

  const noOrgUser = await createUser(EMAILS.noOrgUser);
  // Strip the auto-provisioned membership so this user truly has no org.
  await rw.from("organization_members").delete().eq("user_id", noOrgUser);

  const platformAdmin = await createUser(EMAILS.platformAdmin, { role: "admin" });

  const state = {
    url: URL,
    password: PASSWORD,
    orgA,
    orgB,
    users: { ownerA, adminA, memberA, ownerB, crossUser, noOrgUser, platformAdmin },
    emails: EMAILS,
  };
  const out = join(dirname(fileURLToPath(import.meta.url)), "state.json");
  writeFileSync(out, JSON.stringify(state, null, 2) + "\n");
  console.log("Wrote", out);
  console.log(JSON.stringify({ orgA, orgB, users: state.users }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
