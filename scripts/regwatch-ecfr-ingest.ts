import { readFileSync } from "node:fs";

// Load .env.local into process.env (standalone scripts don't get Next's loader).
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // .env.local optional if the vars are already exported.
}

import { createServiceClient } from "../src/lib/regwatch/supabase/service";
import { persistItems } from "../src/lib/regwatch/connectors/persist";
import { persistHierarchy } from "../src/lib/regwatch/connectors/persist-hierarchy";
import { ECFR_TITLE_CONNECTORS } from "../src/lib/regwatch/connectors/ecfr-title";
import { getJurisdictionHierarchy } from "../src/lib/regwatch/regulatory-sections";

const REGULATORS = [
  {
    slug: "us-cfr-10",
    name: "Code of Federal Regulations — Title 10 (Energy)",
    short_name: "10 CFR",
    jurisdiction_code: "US",
    jurisdiction_name: "United States",
    region: "na",
    regulator_type: "authority",
    canonical_url: "https://www.ecfr.gov/current/title-10",
    description:
      "Title 10 of the U.S. Code of Federal Regulations — Energy. Covers the Nuclear Regulatory Commission and the Department of Energy (and smaller boards), sourced from eCFR.",
    topic_domains: ["energy", "nuclear", "radiation", "emissions", "permitting", "reporting", "worker-safety"],
  },
];

async function main() {
  const svc = createServiceClient();

  console.log("→ upserting regulators…");
  const { error: regErr } = await svc
    .from("regulators")
    .upsert(REGULATORS, { onConflict: "slug" });
  if (regErr) throw new Error(`regulator upsert: ${regErr.message}`);
  console.log(`  ok (${REGULATORS.length})`);

  const ctx = { lookbackDays: 30, now: new Date(), dryRun: false };
  for (const c of ECFR_TITLE_CONNECTORS) {
    console.log(`\n→ ${c.id}`);
    const run = await c.run(ctx);
    console.log(`  fetched ${run.fetched} part items, ${run.errors.length} errors`);
    if (run.errors.length) console.log(`    ${run.errors.slice(0, 3).join("\n    ")}`);

    const p = await persistItems(run.items);
    console.log(`  persisted ${p.inserted} items, skipped ${p.skipped}, ${p.errors.length} errors`);
    if (p.errors.length) console.log(`    ${p.errors.slice(0, 3).join("\n    ")}`);

    if (c.buildHierarchy) {
      const roots = await c.buildHierarchy(ctx);
      const h = await persistHierarchy(c.regulator_slug, "US", roots);
      console.log(`  hierarchy upserted ${h.upserted} sections, ${h.errors.length} errors`);
      if (h.errors.length) console.log(`    ${h.errors.slice(0, 3).join("\n    ")}`);
    }
  }

  // ---- verification ----
  console.log("\n→ verifying corpus…");
  const sum = await svc
    .from("jurisdiction_summary")
    .select("*")
    .eq("jurisdiction_code", "US")
    .maybeSingle();
  console.log(`  US summary: ${JSON.stringify(sum.data)}`);

  const r = await svc.from("regulators").select("id").eq("slug", "us-cfr-10").single();
  const id = r.data!.id;
  const items = await svc
    .from("regulatory_items")
    .select("id", { count: "exact", head: true })
    .eq("regulator_id", id);
  const secs = await svc
    .from("regulatory_sections")
    .select("id", { count: "exact", head: true })
    .eq("regulator_id", id);
  const linked = await svc
    .from("regulatory_sections")
    .select("id", { count: "exact", head: true })
    .eq("regulator_id", id)
    .not("regulatory_item_id", "is", null);
  console.log(`  us-cfr-10: items=${items.count} sections=${secs.count} linkedLeaves=${linked.count}`);

  // Confirm getJurisdictionHierarchy returns the whole US tree (no truncation).
  const tree = await getJurisdictionHierarchy("US");
  let nodes = 0;
  const stack = [...tree];
  while (stack.length) {
    const x = stack.pop()!;
    nodes++;
    stack.push(...x.children);
  }
  console.log(`  getJurisdictionHierarchy(US) → ${tree.length} roots, ${nodes} nodes assembled`);

  console.log("\n✓ done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
