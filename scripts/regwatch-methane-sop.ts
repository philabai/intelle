import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import { createServiceClient } from "../src/lib/regwatch/supabase/service";
import {
  doc, h1, h2, h3, p, bullets, numbered, metaTable, pageBreak, bold,
  type PMNode,
} from "../src/lib/regwatch/templates/pm-helpers";

/**
 * Author a fully prefilled ISO 9001 SOP for methane holding tanks under the
 * Northwind Energy (demo) org, mirroring createDocumentFromTemplate():
 * internal_documents + initial revision + audit event. Then link real methane
 * regulations (with clause anchors), create + link two methane holding-tank
 * assets, and place the document into the review workflow (in_review with a
 * reviewer assigned). Idempotent: removes any prior SOP-MET-001 + MHT-2xx first.
 *
 *   npx tsx scripts/regwatch-methane-sop.ts
 */

const INTERNAL_CODE = "SOP-MET-001";
const TANK_CODES = ["MHT-201", "MHT-202"];

// ---- helpers -------------------------------------------------------------
function plainText(node: unknown): string {
  const out: string[] = [];
  (function walk(n: unknown) {
    if (!n || typeof n !== "object") return;
    const x = n as { type?: string; text?: string; content?: unknown[] };
    if (x.type === "text" && typeof x.text === "string") out.push(x.text);
    if (Array.isArray(x.content)) for (const c of x.content) walk(c);
  })(node);
  return out.join(" ").replace(/\s+/g, " ").trim();
}

/** Section = page break + H2 heading + prefilled body (no italic prompt). */
function sec(heading: string, ...body: PMNode[]): PMNode[] {
  return [pageBreak(), h2(heading), ...body];
}

/** Filled RACI table: header + one row per activity. */
function raci(rows: [string, string, string, string, string][]): PMNode {
  const cell = (t: string, header = false) => ({
    type: header ? "tableHeader" : "tableCell",
    attrs: { colspan: 1, rowspan: 1 },
    content: [p(header ? bold(t) : t)],
  });
  return {
    type: "table",
    content: [
      { type: "tableRow", content: ["Activity", "R", "A", "C", "I"].map((h) => cell(h, true)) },
      ...rows.map((r) => ({ type: "tableRow", content: r.map((c) => cell(c)) })),
    ],
  };
}

// ---- the SOP body (ISO 9001 structure, prefilled for methane tanks) ------
function buildBody() {
  return doc(
    h1("Standard Operating Procedure"),
    metaTable([
      ["Document title", "Methane Holding Tank Operation, Inspection & Emissions Control"],
      ["Document number", INTERNAL_CODE],
      ["Revision", "v0.1.0"],
      ["Effective date", "Pending approval"],
      ["Next review", "10 June 2027"],
      ["Owner", "EHS Manager / Mechanical Integrity"],
      ["Approved by", "Pending review"],
    ]),

    ...sec("1. Purpose",
      p("This procedure defines the controls for the safe operation, mechanical integrity and methane‑emissions management of low‑pressure methane holding tanks and vapour‑recovery knock‑out drums at Northwind Energy. It ensures containment of methane (CH₄, CAS 74‑82‑8), prevents loss of primary containment, and keeps fugitive and vented methane within the limits set by applicable regulations and the site Quality Management System (ISO 9001:2015, clause 8.5 — control of production and service provision)."),
    ),

    ...sec("2. Scope",
      p("Applies to all fixed‑roof and low‑pressure methane holding tanks, surge drums and vapour‑recovery knock‑out vessels within the Flare & Vapour Recovery unit at the Gulf Coast Refinery, and to the operations, mechanical‑integrity and EHS personnel who run, inspect and maintain them."),
      p(bold("Exclusions: "), "high‑pressure LPG bullets and spheres (covered by SOP‑MET‑014) and buried pipework (covered by the pipeline integrity programme)."),
    ),

    ...sec("3. Definitions and abbreviations",
      bullets(
        "Methane (CH₄) — principal component of natural gas; CAS 74‑82‑8; simple asphyxiant and flammable (LEL ≈ 5% v/v).",
        "LDAR — Leak Detection and Repair programme for fugitive‑emission components.",
        "OGI — Optical Gas Imaging; infrared camera survey method for methane leaks.",
        "VRU — Vapour Recovery Unit returning tank vapours to process instead of venting.",
        "MAWP — Maximum Allowable Working Pressure of the tank or vessel.",
        "PVRV — Pressure / Vacuum Relief Valve protecting the tank envelope.",
        "CVS — Closed Vent System routing tank vapours to a control device with no detectable emissions.",
      ),
    ),

    ...sec("4. Responsibilities",
      p("RACI — Responsible / Accountable / Consulted / Informed for each controlled activity."),
      raci([
        ["Routine operation & level / pressure monitoring", "Operator", "Shift Supervisor", "—", "EHS"],
        ["Quarterly OGI / LDAR survey", "MI Technician", "MI Engineer", "EHS", "Operations"],
        ["Tank external & integrity inspection", "API 653 Inspector", "MI Engineer", "Engineering", "EHS"],
        ["PVRV testing & certification", "Maintenance", "MI Engineer", "—", "EHS"],
        ["Emissions recordkeeping & reporting", "EHS Analyst", "EHS Manager", "Operations", "Regulatory"],
      ]),
    ),

    ...sec("5. Procedure",
      h3("5.1 Normal operation"),
      numbered(
        "Maintain tank level and pressure within the operating envelope on the asset data sheet; never exceed MAWP or the low‑pressure cut‑out.",
        "Keep the Vapour Recovery Unit in service at all times that the tank holds methane; vapours are routed to the VRU / closed vent system, not the atmosphere.",
        "Confirm the pressure/vacuum relief valves are isolated‑open and at the correct set‑points each shift; log readings on the operator round sheet.",
      ),
      h3("5.2 Methane emissions monitoring & LDAR"),
      numbered(
        "Perform an Optical Gas Imaging (OGI) survey of all tank fittings, thief hatches, PVRVs and closed‑vent connections at least quarterly (per 40 CFR 60 Subpart OOOOc).",
        "Tag any detected leak, raise a repair work order, and complete first attempt at repair within 5 calendar days and final repair within 30 days.",
        "Verify thief hatches and gauge hatches are closed and sealed; a hatch found open without justification is recorded as a deviation.",
      ),
      h3("5.3 Tank integrity inspection"),
      numbered(
        "Conduct a monthly external visual inspection of the shell, roof, bottom/chime and foundation; record corrosion, distortion, coating condition and any product weep.",
        "Schedule formal external and internal inspections to API 653 intervals; UT‑map the bottom and shell at the assigned frequency.",
        "Escalate any finding that could affect fitness‑for‑service to the MI Engineer for an API 579 evaluation.",
      ),
      h3("5.4 Overfill & overpressure protection"),
      numbered(
        "Prove high‑ and high‑high level alarms and the automatic shutdown against API 2350 at the scheduled test interval.",
        "Function‑test and recertify PVRVs to the maintenance plan; replace any valve failing set‑point or seat‑tightness.",
      ),
      h3("5.5 Abnormal operation, venting & flaring control"),
      numbered(
        "On VRU trip, follow the upset response: minimise venting, route to flare where designed, and notify the Shift Supervisor and EHS.",
        "Record the cause, duration and estimated methane volume of any venting or flaring event for the emissions log.",
      ),
      h3("5.6 Recordkeeping"),
      numbered(
        "File all survey, inspection, test and deviation records to the document management system within 24 hours.",
        "Calculate monthly methane emissions (mass balance + emission factors) and reconcile against the OGMP 2.0 reporting framework.",
      ),
    ),

    ...sec("6. References",
      bullets(
        "ISO 9001:2015 — clause 8.5 (control of production & service provision) and clause 7.5 (documented information).",
        "US EPA 40 CFR 60 Subpart OOOOc — Emission Guidelines for existing oil & gas sources (storage‑vessel affected facilities; LDAR).",
        "US EPA 40 CFR 60 Subpart OOOOb — Standards of Performance for new, reconstructed and modified sources.",
        "EU Regulation 2024/1787 — methane emissions reduction in the energy sector (LDAR surveys).",
        "API 653 — Tank Inspection, Repair, Alteration and Reconstruction; API 2350 — Overfill Protection for Storage Tanks.",
        "OGMP 2.0 — Oil & Gas Methane Partnership reporting framework.",
      ),
    ),

    ...sec("7. Records",
      bullets(
        "OGI / LDAR survey logs and repair records — retained 5 years (per Subpart OOOOc).",
        "Tank external / internal inspection reports (API 653) — retained for the life of the tank.",
        "PVRV test and certification records — retained 5 years.",
        "Monthly methane‑emissions calculations and deviation reports — retained 5 years.",
      ),
    ),

    ...sec("8. Revision history",
      p("Revision history is maintained automatically by the version‑control panel; every committed save creates an immutable revision row."),
      bullets("v0.1.0 — Initial draft created from the ISO 9001 — Standard Operating Procedure template (this revision)."),
    ),

    ...sec("9. Appendices",
      bullets(
        "Appendix A — Methane holding‑tank LDAR route map and fugitive‑component count.",
        "Appendix B — Tank external inspection checklist (monthly).",
        "Appendix C — Methane‑emissions calculation worksheet (mass balance + emission factors).",
      ),
    ),
  );
}

// ---- main ----------------------------------------------------------------
async function main() {
  const svc = createServiceClient();
  const org = await svc.from("organizations").select("id").eq("slug", "demo").single();
  const orgId = org.data!.id as string;
  const owner = await svc.from("organization_members").select("user_id").eq("organization_id", orgId).eq("role", "owner").single();
  const userId = owner.data!.user_id as string;
  const folder = await svc.from("internal_document_folders").select("id").eq("organization_id", orgId).eq("name", "SOP").maybeSingle();
  const folderId = (folder.data?.id as string) ?? null;
  const flare = await svc.from("assets").select("id").eq("organization_id", orgId).eq("name", "Flare & Vapor Recovery").maybeSingle();
  const flareId = flare.data?.id as string | undefined;

  // Idempotent cleanup.
  const prior = await svc.from("internal_documents").select("id").eq("organization_id", orgId).eq("internal_code", INTERNAL_CODE);
  for (const d of prior.data ?? []) await svc.from("internal_documents").delete().eq("id", d.id);
  await svc.from("assets").delete().eq("organization_id", orgId).in("code", TANK_CODES);
  console.log(`cleanup: removed ${prior.data?.length ?? 0} prior doc(s) + any ${TANK_CODES.join("/")} assets`);

  // 1. Create the two methane holding-tank assets (under Flare & Vapour Recovery).
  const tankRows = [
    { code: "MHT-201", name: "Methane Holding Tank MHT‑201 (Vapour Recovery)", type: "atmospheric-storage-tank" },
    { code: "MHT-202", name: "Methane Knock‑out / Holding Drum MHT‑202", type: "pressurised-storage-vessel" },
  ].map((t) => ({
    organization_id: orgId,
    parent_id: flareId ?? null,
    level: flareId ? 4 : 3,
    name: t.name,
    code: t.code,
    asset_type: t.type,
    jurisdiction_code: "US",
    substances_cas: ["74-82-8"],
    tags: ["methane", "emissions", "storage"],
    metadata: { service: "methane vapour holding", design_code: "API 650 / ASME VIII" },
    created_by: userId,
  }));
  const tanks = await svc.from("assets").insert(tankRows).select("id, name, code");
  if (tanks.error) throw new Error(`asset insert: ${tanks.error.message}`);
  const tankIds = (tanks.data ?? []).map((a) => a.id as string);
  console.log(`assets: created ${tankIds.length} methane holding tanks`);

  // 2. Build body + insert the document.
  const body = buildBody();
  const bodyText = plainText(body);
  const docIns = await svc.from("internal_documents").insert({
    organization_id: orgId,
    title: "Methane Holding Tanks — Operation, Inspection & Emissions Control SOP",
    doc_kind: "sop",
    internal_code: INTERNAL_CODE,
    version: "v0.1.0",
    effective_date: null,
    next_review_date: "2027-06-10",
    owner_user_id: userId,
    owner_role: "EHS Manager",
    description: "ISO 9001 SOP governing safe operation, mechanical integrity and methane‑emissions control of the refinery's methane holding tanks and vapour‑recovery drums.",
    status: "active",
    body_doc: body,
    body_text_cached: bodyText,
    template_key: "iso-9001-sop",
    review_state: "in_review",
    folder_id: folderId,
    created_by: userId,
  }).select("id").single();
  if (docIns.error) throw new Error(`document insert: ${docIns.error.message}`);
  const docId = docIns.data!.id as string;

  // 3. Initial committed revision + point the doc at it.
  const rev = await svc.from("internal_document_revisions").insert({
    organization_id: orgId,
    internal_document_id: docId,
    revision_number: 1,
    revision_type: "editor",
    body_doc: body,
    body_text: bodyText,
    version_major: 0, version_minor: 1, version_patch: 0,
    version_bump: "minor",
    reason_for_change: "Created from template ISO 9001 — Standard Operating Procedure",
    is_committed: true,
    created_by: userId,
  }).select("id").single();
  if (rev.error) throw new Error(`revision insert: ${rev.error.message}`);
  const revId = rev.data!.id as string;
  await svc.from("internal_documents").update({ current_revision_id: revId }).eq("id", docId);

  // 4. Audit: created.
  await svc.from("internal_document_audit_events").insert({
    organization_id: orgId, internal_document_id: docId, revision_id: revId,
    event_type: "created", actor_user_id: userId, actor_display_snapshot: "Alex Rivera",
    payload: { templateKey: "iso-9001-sop", templateLabel: "ISO 9001 — Standard Operating Procedure", family: "iso-9001" },
  });

  // 5. Link real methane regulations with clause anchors.
  const regRefs: { citation: string; anchor: string; why: string }[] = [
    { citation: "40 CFR 60 OOOOc", anchor: "Subpart OOOOc — storage‑vessel affected facility; LDAR", why: "SOP implements the existing‑source methane controls and quarterly LDAR for storage vessels." },
    { citation: "89 FR 16280", anchor: "Subpart OOOOb — new / modified storage vessels", why: "Applies to any new or modified methane holding tank at the unit." },
    { citation: "Regulation (EU) 2024/1787", anchor: "Art. 12 — LDAR surveys", why: "Aligns LDAR survey frequency and reporting for EU‑facing operations." },
    { citation: "89 FR 25378", anchor: "Venting & flaring limitations", why: "Limits routine venting/flaring of methane from storage and production." },
  ];
  let regLinked = 0;
  for (const r of regRefs) {
    const ri = await svc.from("regulatory_items").select("id, last_changed_at").ilike("citation", `%${r.citation}%`).limit(1).maybeSingle();
    if (!ri.data) { console.log(`  · reg not found: ${r.citation}`); continue; }
    const ins = await svc.from("internal_document_regulation_links").insert({
      organization_id: orgId, internal_document_id: docId, regulatory_item_id: ri.data.id,
      clause_anchor: r.anchor, link_rationale: r.why,
      linked_at_item_version: (ri.data.last_changed_at as string) ?? null, created_by: userId,
    });
    if (!ins.error) regLinked++; else console.log(`  · reg link err (${r.citation}): ${ins.error.message}`);
  }

  // 6. Link assets (the two new tanks + the Flare & Vapour Recovery unit).
  const assetLinks = [
    ...tankIds.map((id) => ({ asset_id: id, why: "This SOP governs operation, inspection and methane‑emissions control of this holding tank." })),
    ...(flareId ? [{ asset_id: flareId, why: "Parent unit whose vapour‑recovery holding tanks this SOP covers." }] : []),
  ].map((a) => ({ organization_id: orgId, internal_document_id: docId, asset_id: a.asset_id, link_rationale: a.why, created_by: userId }));
  const al = await svc.from("internal_document_asset_links").insert(assetLinks);
  const assetLinked = al.error ? 0 : assetLinks.length;
  if (al.error) console.log(`  · asset link err: ${al.error.message}`);

  // 7. Workflow: submit for review + assign a reviewer.
  await svc.from("internal_document_audit_events").insert({
    organization_id: orgId, internal_document_id: docId, revision_id: revId,
    event_type: "submitted_for_review", actor_user_id: userId, actor_display_snapshot: "Alex Rivera",
    payload: { from: "draft", to: "in_review" },
  });
  await svc.from("internal_document_review_assignments").insert({
    organization_id: orgId, internal_document_id: docId, user_id: userId, role: "reviewer", assigned_by: userId,
  });
  await svc.from("internal_document_audit_events").insert({
    organization_id: orgId, internal_document_id: docId, revision_id: revId,
    event_type: "reviewer_assigned", actor_user_id: userId, actor_display_snapshot: "Alex Rivera",
    payload: { assigneeUserId: userId, role: "reviewer" },
  });

  // ---- verify ----
  const check = await svc.from("internal_documents").select("id, title, internal_code, review_state, template_key, current_revision_id").eq("id", docId).single();
  console.log("\n✓ created SOP");
  console.log(`  ${JSON.stringify(check.data)}`);
  console.log(`  regulations linked: ${regLinked}/${regRefs.length} | assets linked: ${assetLinked} | body chars: ${bodyText.length}`);
  console.log(`  open:  /regwatch/documents/${docId}`);
  console.log(`  edit:  /regwatch/documents/${docId}/edit`);
}

main().catch((e) => { console.error(e); process.exit(1); });
