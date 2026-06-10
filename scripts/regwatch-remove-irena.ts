import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import { createServiceClient } from "../src/lib/regwatch/supabase/service";

/**
 * Remove the IRENA regulator (int-irena) from the corpus.
 *
 * IRENA publishes no machine-accessible regulatory catalogue we can ingest, so
 * the regulator sat empty and was dropped from the product. Deleting the
 * regulators row cascades to regulatory_items / regulatory_sections /
 * footprint_matches / impact_briefings via ON DELETE CASCADE — though IRENA had
 * no items, so this is effectively just removing the empty publisher. The seed
 * migration row was removed in the same change so fresh DBs won't re-create it.
 *
 *   npx tsx scripts/regwatch-remove-irena.ts
 */

async function main() {
  const svc = createServiceClient();
  const { data: reg } = await svc
    .from("regulators")
    .select("id, name")
    .eq("slug", "int-irena")
    .maybeSingle();

  if (!reg) {
    console.log("int-irena not present — nothing to remove.");
    return;
  }

  const { count: itemCount } = await svc
    .from("regulatory_items")
    .select("id", { count: "exact", head: true })
    .eq("regulator_id", reg.id);
  console.log(`Found "${reg.name}" with ${itemCount ?? 0} items — deleting (cascades)…`);

  const { error } = await svc.from("regulators").delete().eq("slug", "int-irena");
  if (error) throw new Error(`delete: ${error.message}`);

  const { data: check } = await svc
    .from("regulators")
    .select("id")
    .eq("slug", "int-irena")
    .maybeSingle();
  const intSummary = await svc
    .from("jurisdiction_summary")
    .select("regulator_count, item_count")
    .eq("jurisdiction_code", "INT")
    .maybeSingle();

  console.log(`\n✓ removed — int-irena now ${check ? "STILL PRESENT (?!)" : "gone"}`);
  console.log(`  INT jurisdiction now: ${JSON.stringify(intSummary.data)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
