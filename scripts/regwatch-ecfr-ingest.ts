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

// slug → row, mirroring the 20260722/24/25 regulator migrations.
const REGULATORS: Record<string, Record<string, unknown>> = {
  "us-cfr-10": {
    slug: "us-cfr-10",
    name: "Code of Federal Regulations — Title 10 (Energy)",
    short_name: "10 CFR",
    jurisdiction_code: "US",
    jurisdiction_name: "United States",
    region: "na",
    regulator_type: "authority",
    canonical_url: "https://www.ecfr.gov/current/title-10",
    description:
      "Title 10 of the U.S. Code of Federal Regulations — Energy (NRC + DOE), sourced from eCFR.",
    topic_domains: ["energy", "nuclear", "radiation", "emissions", "permitting", "reporting", "worker-safety"],
  },
  "us-cfr-14": {
    slug: "us-cfr-14",
    name: "Code of Federal Regulations — Title 14 (Aeronautics and Space)",
    short_name: "14 CFR",
    jurisdiction_code: "US",
    jurisdiction_name: "United States",
    region: "na",
    regulator_type: "authority",
    canonical_url: "https://www.ecfr.gov/current/title-14",
    description:
      "Title 14 of the U.S. Code of Federal Regulations — Aeronautics and Space (FAA, Commercial Space, NASA), sourced from eCFR.",
    topic_domains: ["aviation", "aerospace", "permitting", "reporting", "worker-safety", "emissions"],
  },
  "us-cfr-21": {
    slug: "us-cfr-21",
    name: "Code of Federal Regulations — Title 21 (Food and Drugs)",
    short_name: "21 CFR",
    jurisdiction_code: "US",
    jurisdiction_name: "United States",
    region: "na",
    regulator_type: "authority",
    canonical_url: "https://www.ecfr.gov/current/title-21",
    description:
      "Title 21 of the U.S. Code of Federal Regulations — Food and Drugs (FDA + DEA), sourced from eCFR.",
    topic_domains: ["food-safety", "drugs", "medical-devices", "cosmetics", "tobacco", "chemicals", "permitting", "reporting"],
  },
};

async function main() {
  const svc = createServiceClient();

  // Optional argv filter: connector ids to run (default = all).
  const filter = process.argv.slice(2);
  const connectors = filter.length
    ? ECFR_TITLE_CONNECTORS.filter((c) => filter.includes(c.id))
    : ECFR_TITLE_CONNECTORS;
  if (connectors.length === 0) throw new Error(`no connectors match ${filter.join(",")}`);

  const ctx = { lookbackDays: 30, now: new Date(), dryRun: false };
  for (const c of connectors) {
    const reg = REGULATORS[c.regulator_slug];
    if (reg) {
      const { error } = await svc.from("regulators").upsert(reg, { onConflict: "slug" });
      if (error) throw new Error(`regulator upsert ${c.regulator_slug}: ${error.message}`);
    }

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

      const idResp = await svc
        .from("regulators")
        .select("id")
        .eq("slug", c.regulator_slug)
        .single();
      if (idResp.data) {
        const linked = await svc
          .from("regulatory_sections")
          .select("id", { count: "exact", head: true })
          .eq("regulator_id", idResp.data.id)
          .not("regulatory_item_id", "is", null);
        console.log(`  linked part leaves: ${linked.count}`);
      }
    }
  }

  // Confirm getJurisdictionHierarchy returns the whole US tree (paginated).
  const tree = await getJurisdictionHierarchy("US");
  let nodes = 0;
  const stack = [...tree];
  while (stack.length) {
    const x = stack.pop()!;
    nodes++;
    stack.push(...x.children);
  }
  console.log(`\nUS tree: ${tree.length} roots, ${nodes} nodes assembled`);
  console.log("✓ done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
