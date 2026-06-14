/**
 * Multi-tenant RLS isolation probe (Phase 2).
 *
 * Connects to the TEST Supabase DB and, for each fixture user, simulates their
 * authenticated JWT inside a transaction (`set local role authenticated` +
 * request.jwt.claims) so RLS policies evaluate exactly as they would for that
 * user via PostgREST. Asserts positive controls (own-org visible/writable) and
 * negative controls (cross-tenant invisible/denied), including admin-only writes.
 *
 * Run: node tests/isolation/rls-probe.mjs   (reads .env.test)
 */
import { readFileSync } from "node:fs";
import pg from "pg";

// --- load .env.test ---
for (const line of readFileSync(new URL("../../.env.test", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
const DB = process.env.SUPABASE_DB_URL;
if (!DB) { console.error("SUPABASE_DB_URL missing in .env.test"); process.exit(1); }

const client = new pg.Client({ connectionString: DB });
const results = [];
function record(actor, name, pass, detail = "") {
  results.push({ actor, name, pass, detail });
  const tag = pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${tag}  [${actor}] ${name}${detail ? "  — " + detail : ""}`);
}

/** Run fn inside a transaction with the given user's RLS context, then rollback. */
async function asUser(uid, fn) {
  await client.query("begin");
  try {
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
    return await fn();
  } finally {
    await client.query("rollback"); // also resets role
  }
}
async function count(table, where, params) {
  const { rows } = await client.query(`select count(*)::int n from regwatch.${table} ${where}`, params);
  return rows[0].n;
}
/** Try a write inside a savepoint so an RLS error doesn't abort the whole txn.
 * Returns {ok:true,rows} on success, or {ok:false,err} if RLS denied (threw). */
async function tryWrite(sql, params) {
  await client.query("savepoint w");
  try {
    const r = await client.query(sql, params);
    await client.query("release savepoint w");
    return { ok: true, rows: r.rowCount };
  } catch (e) {
    await client.query("rollback to savepoint w");
    return { ok: false, err: e.message };
  }
}

async function main() {
  await client.connect();

  // Resolve fixture ids.
  const ids = {};
  const { rows: users } = await client.query("select id, email from auth.users where email like '%@qa.test'");
  for (const u of users) ids[u.email] = u.id;
  const orgOf = async (email, role) => {
    const { rows } = await client.query(
      `select m.organization_id o from regwatch.organization_members m join auth.users u on u.id=m.user_id
       where u.email=$1 ${role ? "and m.role=$2" : ""} limit 1`, role ? [email, role] : [email]);
    return rows[0]?.o ?? null;
  };
  const A1 = ids["a1-owner@qa.test"], A2 = ids["a2-admin@qa.test"], A3 = ids["a3-member@qa.test"];
  const B1 = ids["b1-owner@qa.test"], X = ids["x-crossorg@qa.test"], N = ids["n-noorg@qa.test"];
  const ORG_A = await orgOf("a1-owner@qa.test", "owner");
  const ORG_B = await orgOf("b1-owner@qa.test", "owner");
  const ORG_X = await orgOf("x-crossorg@qa.test", "owner");
  console.log(`\nORG_A=${ORG_A}  ORG_B=${ORG_B}  ORG_X=${ORG_X}\n`);

  const TENANT_TABLES = ["organizations", "organization_members", "operations_footprints",
    "assets", "internal_documents", "footprint_matches", "audit_log"];
  const orgCol = (t) => (t === "organizations" ? "id" : "organization_id");

  // ---- READ isolation: each actor sees own org, not the foreign org --------
  console.log("── READ isolation ──");
  for (const [label, uid, ownOrg, foreignOrg] of [
    ["A1-owner", A1, ORG_A, ORG_B],
    ["A3-member", A3, ORG_A, ORG_B],
    ["B1-owner", B1, ORG_B, ORG_A],
  ]) {
    await asUser(uid, async () => {
      for (const t of TENANT_TABLES) {
        const own = await count(t, `where ${orgCol(t)}=$1`, [ownOrg]);
        const foreign = await count(t, `where ${orgCol(t)}=$1`, [foreignOrg]);
        record(label, `${t}: foreign org invisible`, foreign === 0, `foreign=${foreign}, own=${own}`);
      }
    });
  }

  // Positive control: A1 CAN see its own internal doc + org.
  await asUser(A1, async () => {
    record("A1-owner", "own org visible (positive control)", (await count("organizations", "where id=$1", [ORG_A])) === 1);
    record("A1-owner", "own internal_documents visible", (await count("internal_documents", "where organization_id=$1", [ORG_A])) >= 1);
  });

  // ---- Multi-org user X: sees Org B + Org X, NOT Org A (F12 behaviour) ------
  console.log("── Multi-org (X = member of B + owner of X) ──");
  await asUser(X, async () => {
    record("X-crossorg", "Org B visible (is member)", (await count("organizations", "where id=$1", [ORG_B])) === 1);
    record("X-crossorg", "Org X visible (is owner)", (await count("organizations", "where id=$1", [ORG_X])) === 1);
    record("X-crossorg", "Org A invisible (not a member)", (await count("organizations", "where id=$1", [ORG_A])) === 0);
  });

  // ---- No-org user sees nothing -------------------------------------------
  console.log("── No-org user ──");
  await asUser(N, async () => {
    for (const t of TENANT_TABLES) {
      record("N-noorg", `${t}: nothing visible`, (await count(t, "", [])) === 0);
    }
  });

  // ---- WRITE isolation: A1 cannot write into Org B -------------------------
  console.log("── WRITE isolation (A1 → Org B) ──");
  await asUser(A1, async () => {
    const ins = await tryWrite(
      "insert into regwatch.assets (organization_id, level, name, asset_type) values ($1, 2, 'EVIL', 'site')", [ORG_B]);
    record("A1-owner", "INSERT asset into Org B denied", ins.ok === false || ins.rows === 0, ins.err ? "RLS denied" : `rows=${ins.rows}`);
    const upd = await tryWrite("update regwatch.organizations set name='HACKED' where id=$1", [ORG_B]);
    record("A1-owner", "UPDATE Org B name affects 0 rows", upd.ok && upd.rows === 0, `rows=${upd.rows ?? "err"}`);
  });

  // ---- Role escalation inside Org A: member cannot do admin-only writes ----
  console.log("── Role escalation (A3 member vs A2 admin, within Org A) ──");
  await asUser(A3, async () => {
    const promote = await tryWrite(
      "update regwatch.organization_members set role='owner' where organization_id=$1 and user_id=$2", [ORG_A, A3]);
    record("A3-member", "self-promote to owner blocked", promote.ok && promote.rows === 0, `rows=${promote.rows ?? "err"}`);
    const addMember = await tryWrite(
      "insert into regwatch.organization_members (organization_id, user_id, role) values ($1,$2,'admin')", [ORG_A, N]);
    record("A3-member", "add member (admin-only) denied", addMember.ok === false || addMember.rows === 0, addMember.err ? "RLS denied" : `rows=${addMember.rows}`);
    const editOrg = await tryWrite("update regwatch.organizations set name='renamed-by-member' where id=$1", [ORG_A]);
    record("A3-member", "edit org settings (admin-only) blocked", editOrg.ok && editOrg.rows === 0, `rows=${editOrg.rows ?? "err"}`);
  });
  await asUser(A2, async () => {
    const editOrg = await tryWrite("update regwatch.organizations set name='renamed-by-admin' where id=$1", [ORG_A]);
    record("A2-admin", "admin CAN edit own org settings (positive)", editOrg.ok && editOrg.rows === 1, `rows=${editOrg.rows ?? "err"}`);
  });

  // ---- Summary -------------------------------------------------------------
  const fails = results.filter((r) => !r.pass);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`RLS ISOLATION PROBE: ${results.length - fails.length}/${results.length} passed, ${fails.length} failed`);
  if (fails.length) {
    console.log("\nFAILURES:");
    for (const f of fails) console.log(`  ✗ [${f.actor}] ${f.name} (${f.detail})`);
  }
  await client.end();
  process.exit(fails.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
