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
import { CNSC_CONNECTORS } from "../src/lib/regwatch/connectors/cnsc-scraper";
import { CER_CONNECTORS } from "../src/lib/regwatch/connectors/cer-act";

const REGULATORS = [
  {
    slug: "ca-cnsc",
    name: "Canadian Nuclear Safety Commission",
    short_name: "CNSC",
    jurisdiction_code: "CA",
    jurisdiction_name: "Canada",
    region: "na",
    regulator_type: "commission",
    canonical_url: "https://www.cnsc-ccsn.gc.ca",
    description:
      "Canada's federal nuclear regulator — regulates the use of nuclear energy and materials to protect health, safety, security and the environment. Publishes the REGDOC series of regulatory documents.",
    topic_domains: ["nuclear", "radiation", "process-safety", "worker-safety", "permitting"],
  },
  {
    slug: "ca-cer",
    name: "Canada Energy Regulator",
    short_name: "CER",
    jurisdiction_code: "CA",
    jurisdiction_name: "Canada",
    region: "na",
    regulator_type: "federal-agency",
    canonical_url: "https://www.cer-rec.gc.ca",
    description:
      "Canada's federal energy regulator — oversees interprovincial and international pipelines, power lines, energy trade, and offshore renewable energy projects under the Canadian Energy Regulator Act (C-15.1).",
    topic_domains: ["energy", "pipelines", "emissions", "methane", "permitting", "reporting"],
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
  for (const c of [...CNSC_CONNECTORS, ...CER_CONNECTORS]) {
    console.log(`\n→ ${c.id}`);
    const run = await c.run(ctx);
    console.log(`  fetched ${run.fetched} items, ${run.errors.length} errors`);
    if (run.errors.length) console.log(`    ${run.errors.slice(0, 3).join("\n    ")}`);

    const p = await persistItems(run.items);
    console.log(`  persisted ${p.inserted} items, skipped ${p.skipped}, ${p.errors.length} errors`);
    if (p.errors.length) console.log(`    ${p.errors.slice(0, 3).join("\n    ")}`);

    if (c.buildHierarchy) {
      const roots = await c.buildHierarchy(ctx);
      const h = await persistHierarchy(c.regulator_slug, "CA", roots);
      console.log(`  hierarchy upserted ${h.upserted} sections, ${h.errors.length} errors`);
      if (h.errors.length) console.log(`    ${h.errors.slice(0, 3).join("\n    ")}`);
    }
  }

  // ---- verification ----
  console.log("\n→ verifying corpus…");
  const sum = await svc
    .from("jurisdiction_summary")
    .select("*")
    .eq("jurisdiction_code", "CA")
    .maybeSingle();
  console.log(`  CA summary: ${JSON.stringify(sum.data)}`);
  for (const slug of ["ca-cnsc", "ca-cer"]) {
    const r = await svc.from("regulators").select("id").eq("slug", slug).single();
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
    console.log(
      `  ${slug}: items=${items.count} sections=${secs.count} linkedLeaves=${linked.count}`,
    );
  }
  const s10 = await svc
    .from("regulatory_items")
    .select("citation,title,body_text")
    .eq("slug", "canadian-energy-regulator-act-s-10")
    .maybeSingle();
  console.log(
    `  CER s.10: "${s10.data?.title}" — ${(s10.data?.body_text || "").length} body chars`,
  );

  console.log("\n✓ done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
