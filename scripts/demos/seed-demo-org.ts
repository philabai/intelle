import { createClient } from "@supabase/supabase-js";
import { DEMO, loadEnv } from "./config";

/**
 * Seeds a dedicated, isolated demo org ("Northwind Energy") + user
 * (demo@intelle.io) with a configured footprint, an asset tree, a few
 * obligations, and some documents — so the Monitor/Comply/Author demo videos
 * never show empty states. Separate from any real org.
 *
 * Idempotent: refreshes the user's password, bumps tier=team, and wipes +
 * reseeds the org's assets/obligations/documents on each run.
 *
 *   npx tsx scripts/demos/seed-demo-org.ts
 */

loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: "regwatch" },
});
const auth = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUser(email: string) {
  const { data, error } = await auth.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase()) ?? null;
}

async function main() {
  const meta = {
    full_name: `${DEMO.firstName} ${DEMO.lastName}`,
    first_name: DEMO.firstName,
    last_name: DEMO.lastName,
    org_name: DEMO.orgName,
  };

  // 1. User (the signup trigger provisions org + owner membership + empty footprint).
  let user = await findUser(DEMO.email);
  if (!user) {
    console.log(`Creating ${DEMO.email} …`);
    const { data, error } = await auth.auth.admin.createUser({
      email: DEMO.email,
      password: DEMO.password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) throw error;
    user = data.user;
  } else {
    console.log(`Refreshing ${DEMO.email} …`);
    const { error } = await auth.auth.admin.updateUserById(user.id, {
      password: DEMO.password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) throw error;
  }
  const userId = user!.id;

  // 2. Resolve the owner org.
  const { data: mems, error: memErr } = await db
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId);
  if (memErr) throw memErr;
  const ownerOrg = mems?.find((m) => m.role === "owner")?.organization_id as string | undefined;
  if (!ownerOrg) throw new Error("No owner org for demo user (signup trigger didn't run?)");
  console.log(`  org: ${ownerOrg}`);

  // 3. tier = team; ensure name.
  await db.from("organizations").update({ tier: "team", name: DEMO.orgName }).eq("id", ownerOrg);

  // 4. Footprint — US/EU/UK oil & gas + nuclear.
  const footprint = {
    geographies: ["US", "EU", "GB", "CA"],
    activities_naics: ["211120", "324110", "325110", "221113"],
    monitored_regulator_slugs: ["us-epa", "us-osha", "us-cfr-10", "eu-echa"],
    monitored_topics: ["emissions", "methane", "worker-safety", "process-safety", "nuclear"],
    substances_cas: ["74-82-8", "7727-37-9"],
    is_configured: true,
    configured_at: new Date().toISOString(),
  };
  const { data: fpRows } = await db
    .from("operations_footprints")
    .update(footprint)
    .eq("organization_id", ownerOrg)
    .select("id");
  if (!fpRows?.length) {
    await db.from("operations_footprints").insert({ organization_id: ownerOrg, name: "Default footprint", ...footprint });
  }

  // 5. Wipe org-scoped demo content for a clean reseed.
  await db.from("compliance_obligations").delete().eq("organization_id", ownerOrg);
  await db.from("internal_documents").delete().eq("organization_id", ownerOrg);
  await db.from("internal_document_folders").delete().eq("organization_id", ownerOrg);
  await db.from("assets").delete().eq("organization_id", ownerOrg);

  // 6. Asset hierarchy config + tree.
  await db
    .from("asset_hierarchy_config")
    .upsert(
      {
        organization_id: ownerOrg,
        level_2_label: "Site",
        level_3_label: "Unit",
        level_4_label: "Equipment Class",
        level_5_label: "Equipment",
        level_6_enabled: false,
        starter_pack: "iso-14224",
      },
      { onConflict: "organization_id" },
    );

  async function asset(parent: string | null, level: number, name: string, code: string, type: string | null, jur?: string, tags: string[] = []) {
    const { data, error } = await db
      .from("assets")
      .insert({
        organization_id: ownerOrg,
        parent_id: parent,
        level,
        name,
        code,
        asset_type: type,
        jurisdiction_code: jur ?? null,
        tags,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`asset ${name}: ${error.message}`);
    return data.id as string;
  }

  const refinery = await asset(null, 2, "Gulf Coast Refinery", "GCR-01", "refinery", "US");
  const cdu = await asset(refinery, 3, "Crude Distillation Unit", "CDU-A", "unit", "US", ["critical"]);
  const pumpClass = await asset(cdu, 4, "Centrifugal Pumps", "PUMP", "centrifugal-pump", "US");
  const feedPump = await asset(pumpClass, 5, "P-101A Feed Pump", "P-101A", "centrifugal-pump", "US", ["rotating-equipment", "critical"]);
  const flare = await asset(refinery, 3, "Flare & Vapor Recovery", "FLR-A", "unit", "US", ["emissions"]);

  const nuclear = await asset(null, 2, "Thornton Nuclear Station", "TNS-01", "nuclear-plant", "US");
  const reactorBldg = await asset(nuclear, 3, "Reactor Building", "RB-1", "unit", "US", ["safety-critical"]);
  const vesselClass = await asset(reactorBldg, 4, "Pressure Vessels", "PV", "pressure-vessel", "US");
  const rpv = await asset(vesselClass, 5, "Reactor Pressure Vessel", "RPV-1", "pressure-vessel", "US", ["safety-critical"]);

  console.log("  assets: 9 seeded");

  // 7. Pick a few real regulations to pin obligations to.
  const { data: regs } = await db
    .from("regulatory_items")
    .select("id, citation")
    .eq("jurisdiction_code", "US")
    .overlaps("topics", ["process-safety", "emissions", "nuclear", "worker-safety"])
    .limit(3);
  const reg = (i: number) => regs?.[i]?.id ?? null;

  const obligations = [
    { asset_id: feedPump, regulatory_item_id: reg(0), clause_text: "Mechanical integrity — pressure relief device tested annually.", severity: "critical", compliance_status: "at-risk", review_status: "in-review", review_cadence: "annually", assigned_reviewer_user_id: userId },
    { asset_id: flare, regulatory_item_id: reg(1), clause_text: "Continuous methane / VOC emissions monitoring on the flare header.", severity: "moderate", compliance_status: "compliant", review_status: "verified", review_cadence: "quarterly", assigned_reviewer_user_id: userId },
    { asset_id: rpv, regulatory_item_id: reg(2), clause_text: "Reactor pressure vessel in-service inspection programme.", severity: "catastrophic", compliance_status: "compliant", review_status: "pending-approval", review_cadence: "annually", assigned_reviewer_user_id: userId },
    { asset_id: cdu, regulatory_item_id: null, clause_text: "5-year turnaround inspection per company standard NW-STD-014.", severity: "moderate", compliance_status: "unknown", review_status: "open", review_cadence: "none", assigned_reviewer_user_id: null },
  ];
  for (const o of obligations) {
    const { error } = await db.from("compliance_obligations").insert({
      organization_id: ownerOrg,
      created_by: userId,
      review_due_at: new Date(Date.now() + 30 * 864e5).toISOString(),
      ...o,
    });
    if (error) throw new Error(`obligation: ${error.message}`);
  }
  console.log(`  obligations: ${obligations.length} seeded`);

  // 8. Document folders + documents.
  const { data: folder } = await db
    .from("internal_document_folders")
    .insert({ organization_id: ownerOrg, name: "EHS & Compliance", description: "Policies, procedures and permits", created_by: userId })
    .select("id")
    .single();
  const folderId = folder?.id ?? null;

  const docs = [
    { title: "Process Safety Management Manual", doc_kind: "sop", internal_code: "SOP-EHS-014", version: "2.1", description: "Company PSM programme covering pressure equipment, MOC and PHA.", status: "active" },
    { title: "Air Emissions Monitoring Policy", doc_kind: "policy", internal_code: "POL-ENV-003", version: "1.0", description: "Methane and VOC monitoring, recordkeeping and reporting policy.", status: "active" },
    { title: "Reactor ISI Programme (draft)", doc_kind: "internal-standard", internal_code: "STD-NUC-009", version: "0.1", description: "In-service inspection programme for the reactor pressure vessel.", status: "draft" },
  ];
  for (const d of docs) {
    const { error } = await db.from("internal_documents").insert({
      organization_id: ownerOrg,
      owner_user_id: userId,
      owner_role: "EHS Manager",
      folder_id: folderId,
      created_by: userId,
      effective_date: "2026-03-01",
      next_review_date: "2027-03-01",
      ...d,
    });
    if (error) throw new Error(`document ${d.title}: ${error.message}`);
  }
  console.log(`  documents: ${docs.length} seeded`);

  // 9. Saved searches (so the Monitor → Saved page isn't empty).
  await db.from("saved_searches").delete().eq("organization_id", ownerOrg);
  const savedErr = (
    await db.from("saved_searches").insert([
      { user_id: userId, organization_id: ownerOrg, query: "methane emissions monitoring", label: "Methane rules", result_count_at_save: 42, last_run_at: new Date().toISOString() },
      { user_id: userId, organization_id: ownerOrg, query: "pressure vessel inspection", label: "PSM — vessels", result_count_at_save: 18, last_run_at: new Date().toISOString() },
    ])
  ).error;
  if (savedErr) console.log(`  (saved_searches skipped: ${savedErr.message})`);
  else console.log("  saved searches: 2 seeded");

  console.log("\n=================================================================");
  console.log(`  Demo org ready:  ${DEMO.orgName}`);
  console.log(`  Login:           ${DEMO.email} / ${DEMO.password}`);
  console.log(`  Tier:            team`);
  console.log("=================================================================");
}

main().catch((e) => {
  console.error("Failed:", e.message ?? e);
  process.exit(1);
});
