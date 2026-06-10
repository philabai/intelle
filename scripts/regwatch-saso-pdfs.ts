import { readFileSync } from "node:fs";
import { chromium } from "playwright";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import { createServiceClient } from "../src/lib/regwatch/supabase/service";
import { persistHierarchy } from "../src/lib/regwatch/connectors/persist-hierarchy";
import type { HierarchyNode } from "../src/lib/regwatch/connectors/types";

/**
 * Ingest the full SASO Technical Regulations catalogue. The catalogue is an
 * ASP.NET SharePoint ListView paginated via __doPostBack, so we drive it with
 * Playwright: walk every page, collect each card's title + PDF URL, then upsert
 * one regulatory_item per regulation (PDF source, Arabic — the Original tab
 * caches the PDF, the Translation tab does AR→EN on demand). Dedupes against
 * existing items by PDF filename, so the original 12 aren't duplicated.
 */

const INDEX = "https://www.saso.gov.sa/en/laws-and-regulations/technical_regulations/pages/default.aspx";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";

const fn = (u: string) => u.split("?")[0].split("/").pop()!.toLowerCase();
const citationSlug = (c: string) =>
  c.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);

function cleanTitle(raw: string): string {
  return raw
    .replace(/[​‎‏]/g, "")
    .split(/Approval Date|Publication Date|Publication|Effective|Issue Date|Enforcement|تاريخ/i)[0]
    .replace(/\s+/g, " ")
    .trim();
}

function deriveCitation(title: string): string {
  const stripped = title
    .replace(/^\s*(?:Technical\s+Regulations?|General\s+Regulation)\s+(?:for|of)\s+(?:the\s+Requirements\s+for\s+|the\s+)?/i, "")
    .replace(/^\s*Technical\s+Regulation\s+/i, "")
    .replace(/\s+—\s+/g, " ")
    .replace(/\s+-\s+Part/gi, " Part")
    .replace(/\bTheir\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return `SASO TR · ${stripped || title}`;
}

function deriveCategory(title: string): string {
  const x = title.toLowerCase();
  if (/textile|footwear|fabric|garment|leather/.test(x)) return "Textile & Apparel";
  if (/building|cement|steel|concrete|door|window|sanitary|tank|construct|roof|pipe|insulation|cableway|lift|elevator/.test(x)) return "Construction & Materials";
  if (/vehicle|motorcycle|tire|tyre|trailer|escalator|equipment|lubricant|machinery|pressure|barrier|stroller|restraint/.test(x)) return "Mechanical & Vehicles";
  if (/electric|battery|cable|lamp|appliance|voltage|air condition|photovoltaic|solar|electronic|smoking|communication/.test(x)) return "Electrical & Electronics";
  if (/cosmetic|detergent|paint|chemical|petroleum|fuel|ppe|protective|adhesive|glue|varnish|plastic|firework|degradable/.test(x)) return "Chemicals & Substances";
  return "General & Services";
}

function deriveTopics(title: string): string[] {
  const base = new Set<string>(["standards", "gulf", "gcc-alignment"]);
  const t = title.toLowerCase();
  if (/energy|efficien|fuel|petroleum|battery|lamp|air condition|standby|electri/.test(t)) base.add("energy");
  if (/safety|protect|ppe|equipment|machinery|pressure|explosive/.test(t)) base.add("worker-safety");
  if (/cosmetic|paint|detergent|chemical|lubricant/.test(t)) base.add("chemicals");
  if (/emission|fuel|petroleum|vehicle/.test(t)) base.add("emissions");
  if (/building|cement|construct|door|window|tank|sanitary|cableway/.test(t)) base.add("construction");
  return Array.from(base);
}

async function enumerate(): Promise<{ title: string; href: string }[]> {
  const b = await chromium.launch();
  const page = await b.newPage({ userAgent: UA });
  await page.goto(INDEX, { waitUntil: "networkidle", timeout: 60000 });
  const all = new Map<string, { title: string; href: string }>();
  const grab = () =>
    page.$$eval('a[href*=".pdf"]', (els) =>
      els
        .filter((e) => /Technical_regulations/i.test((e as HTMLAnchorElement).href))
        .map((e) => ({
          href: (e as HTMLAnchorElement).href.split("?")[0],
          text: (e.textContent || "").replace(/[​‎‏]/g, "").replace(/\s+/g, " ").trim(),
        })),
    );

  for (let p = 1; p <= 10; p++) {
    await page.waitForTimeout(2800);
    const cards = await grab();
    const before = all.size;
    for (const c of cards) all.set(fn(c.href), { title: c.text, href: c.href });
    console.log(`  page ${p}: ${cards.length} cards, unique ${all.size} (+${all.size - before})`);
    const target = await page
      .$eval("a.Next", (a) => {
        const h = a.getAttribute("href") || "";
        const m = h.match(/__doPostBack\('([^']+)'/);
        return m ? m[1] : null;
      })
      .catch(() => null);
    if (!target) break;
    const firstBefore = cards[0]?.href ?? "";
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle", timeout: 25000 }).catch(() => {}),
      page.evaluate((t) => (window as { __doPostBack?: (a: string, b: string) => void }).__doPostBack?.(t, ""), target),
    ]);
    await page.waitForTimeout(2500);
    // Stop if the page didn't actually advance.
    const after = await grab();
    if ((after[0]?.href ?? "") === firstBefore && p > 1) break;
  }
  await b.close();
  return Array.from(all.values());
}

async function main() {
  const svc = createServiceClient();
  const reg = await svc.from("regulators").select("id").eq("slug", "sa-saso").single();
  const regId = reg.data!.id as string;

  const { data: existing } = await svc
    .from("regulatory_items")
    .select("citation, source_url")
    .eq("regulator_id", regId);
  const existingFiles = new Set((existing ?? []).map((e) => fn(e.source_url as string)));
  console.log(`existing SASO items: ${existing?.length ?? 0}`);

  console.log("enumerating SASO catalogue…");
  const regs = await enumerate();
  console.log(`scraped ${regs.length} regulations across all pages`);

  const nowIso = new Date().toISOString();
  let added = 0, skipped = 0;
  const seenCitations = new Set<string>();
  for (const r of regs) {
    if (existingFiles.has(fn(r.href))) { skipped++; continue; }
    const title = cleanTitle(r.title);
    if (!title || title.length < 6) { skipped++; continue; }
    const citation = deriveCitation(title);
    if (seenCitations.has(citation)) { skipped++; continue; }
    seenCitations.add(citation);
    // Prefer the Arabic PDF (canonical for SASO compliance evidence).
    const arUrl = r.href.replace(/\/en\/Laws-And-Regulations/i, "/ar/Laws-And-Regulations");
    const { error } = await svc.from("regulatory_items").upsert(
      {
        regulator_id: regId,
        citation,
        slug: citationSlug(citation),
        title,
        instrument_type: "standard",
        status: "in-force",
        source_url: arUrl,
        source_language: "ar",
        jurisdiction_code: "SA",
        topics: deriveTopics(title),
        published_at: nowIso,
        last_changed_at: nowIso,
      },
      { onConflict: "regulator_id,citation" },
    );
    if (error) console.log(`  ✗ ${citation}: ${error.message}`);
    else added++;
  }

  // Rebuild the SASO browse hierarchy (Category → Technical Regulation) from
  // the full set of items, so the tree shows every regulation.
  const { data: allItems } = await svc
    .from("regulatory_items")
    .select("citation, title")
    .eq("regulator_id", regId);
  await svc.from("regulatory_sections").delete().eq("regulator_id", regId);
  const root: HierarchyNode = {
    path: "sa.saso", level: 1, level_label: "Publisher", identifier: "SASO",
    title: "Saudi Standards, Metrology and Quality Organization", citation: null,
    source_url: INDEX, children: [],
  };
  const cats = new Map<string, HierarchyNode>();
  for (const it of allItems ?? []) {
    const cat = deriveCategory(it.title as string);
    const cp = `sa.saso.${citationSlug(cat)}`;
    if (!cats.has(cat)) {
      const n: HierarchyNode = { path: cp, level: 2, level_label: "Category", identifier: cat, title: null, citation: null, source_url: INDEX, children: [] };
      cats.set(cat, n);
      root.children.push(n);
    }
    cats.get(cat)!.children.push({
      path: `${cp}.${citationSlug(it.citation as string)}`, level: 3,
      level_label: "Technical Regulation", identifier: it.citation as string,
      title: it.title as string, citation: it.citation as string, source_url: INDEX, children: [],
    });
  }
  const h = await persistHierarchy("sa-saso", "SA", [root]);
  console.log(`hierarchy: ${cats.size} categories, ${h.upserted} nodes`);

  const total = await svc
    .from("regulatory_items")
    .select("id", { count: "exact", head: true })
    .eq("regulator_id", regId);
  console.log(`\n✓ done — added ${added}, skipped ${skipped}. SASO total now ${total.count}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
