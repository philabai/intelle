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
  /* optional */
}

import { createServiceClient } from "../src/lib/regwatch/supabase/service";

/**
 * One-off: populate the Articles body for US CFR Title 10 Part items from the
 * eCFR structured full-content API (clean XML → readable HTML), instead of
 * waiting for the body-enrich cron to scrape the HTML page. Stamps
 * enrichment_metadata.body_fetched_at so the cron skips these rows afterwards.
 */

// slug ↔ title; pass title numbers as argv to filter (default = all).
const ALL_TITLES = [
  { slug: "us-cfr-10", title: 10 },
  { slug: "us-cfr-14", title: 14 },
  { slug: "us-cfr-21", title: 21 },
];
const UA = "vantage-intelle/1.0 (compliance monitoring; +https://intelle.io)";
const MAX_HTML = 400_000; // cap per row
const DELAY_MS = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function titleDate(titleNumber: number): Promise<string> {
  const res = await fetch("https://www.ecfr.gov/api/versioner/v1/titles.json", {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  const data = (await res.json()) as {
    titles?: { number: number; latest_issue_date?: string; up_to_date_as_of?: string }[];
  };
  const t = (data.titles ?? []).find((x) => x.number === titleNumber);
  const d = t?.latest_issue_date ?? t?.up_to_date_as_of;
  if (!d) throw new Error("could not resolve eCFR title date");
  return d;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => codePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => codePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function codePoint(n: number): string {
  try {
    return Number.isFinite(n) ? String.fromCodePoint(n) : "";
  } catch {
    return "";
  }
}

function inlineText(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Convert an eCFR part's full-content XML into readable HTML + plain text. */
function convert(xml: string): { html: string; text: string } {
  const cleaned = xml.replace(
    /<(CITA|AUTH|SOURCE|EDNOTE|FTNT|EAR|PRTPAGE)\b[\s\S]*?<\/\1>/gi,
    "",
  );
  const htmlParts: string[] = [];
  const textParts: string[] = [];
  const re = /<(HEAD|HD\d|P|FP)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const tag = m[1].toUpperCase();
    const text = inlineText(m[2]);
    if (!text) continue;
    if (tag === "HEAD" || tag.startsWith("HD")) {
      htmlParts.push(`<h4>${esc(text)}</h4>`);
    } else {
      htmlParts.push(`<p>${esc(text)}</p>`);
    }
    textParts.push(text);
  }
  let html = htmlParts.join("\n");
  let text = textParts.join("\n\n");
  if (html.length > MAX_HTML) {
    html = html.slice(0, MAX_HTML) + "\n<p>…(truncated — see full text on eCFR)</p>";
    text = text.slice(0, MAX_HTML);
  }
  return { html, text };
}

async function backfillTitle(
  svc: ReturnType<typeof createServiceClient>,
  slug: string,
  title: number,
) {
  const date = await titleDate(title);
  console.log(`\n=== ${slug} (Title ${title}, ${date}) ===`);

  const reg = await svc.from("regulators").select("id").eq("slug", slug).single();
  if (reg.error) throw new Error(reg.error.message);

  const { data: items, error } = await svc
    .from("regulatory_items")
    .select("id, citation")
    .eq("regulator_id", reg.data.id)
    .order("citation", { ascending: true });
  if (error) throw new Error(error.message);
  console.log(`parts to backfill: ${items?.length ?? 0}`);

  let ok = 0,
    empty = 0,
    failed = 0;
  for (const it of items ?? []) {
    const partMatch = (it.citation as string).match(/Part\s+(\S+)/i);
    if (!partMatch) {
      failed++;
      continue;
    }
    const part = partMatch[1];
    const url = `https://www.ecfr.gov/api/versioner/v1/full/${date}/title-${title}.xml?part=${encodeURIComponent(part)}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/xml" },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        failed++;
        console.log(`  Part ${part}: HTTP ${res.status}`);
        await sleep(DELAY_MS);
        continue;
      }
      const xml = await res.text();
      const { html, text } = convert(xml);
      if (!text) {
        empty++;
        await sleep(DELAY_MS);
        continue;
      }
      const upd = await svc
        .from("regulatory_items")
        .update({
          body_html: html,
          body_text: text,
          enrichment_metadata: {
            body_fetched_at: new Date().toISOString(),
            body_source: "ecfr-structured",
          },
        })
        .eq("id", it.id);
      if (upd.error) {
        failed++;
        console.log(`  Part ${part}: update error ${upd.error.message}`);
      } else {
        ok++;
      }
    } catch (e) {
      failed++;
      console.log(`  Part ${part}: ${(e as Error).message}`);
    }
    await sleep(DELAY_MS);
    if ((ok + empty + failed) % 30 === 0) console.log(`  …${ok + empty + failed} processed`);
  }

  console.log(`✓ ${slug} — populated ${ok}, empty ${empty}, failed ${failed}`);
}

async function main() {
  const svc = createServiceClient();
  const filter = process.argv.slice(2).map(Number);
  const titles = filter.length
    ? ALL_TITLES.filter((t) => filter.includes(t.title))
    : ALL_TITLES;
  if (titles.length === 0) throw new Error(`no titles match ${filter.join(",")}`);
  for (const t of titles) await backfillTitle(svc, t.slug, t.title);
  console.log("\n✓ all done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
