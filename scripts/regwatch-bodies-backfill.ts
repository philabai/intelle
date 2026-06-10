import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import { createServiceClient } from "../src/lib/regwatch/supabase/service";
import { extractMainText } from "../src/lib/regwatch/body-fetch";

/**
 * Generic Articles-body backfill for every regulator whose items still lack a
 * body. Mirrors the per-source backfills (US CFR / Canada): fetch the
 * source_url, extract clean main text (HTML via extractMainText, PDFs via
 * unpdf), wrap it as simple <p> HTML, and store body_html + body_text. Also
 * gives body_html to items that already have body_text but no HTML.
 *
 * Skips SASO (sa-saso) — Arabic PDFs handled by the Original + Translation
 * tabs, not Articles. Stamps body_fetched_at so the body-enrich cron skips
 * these rows; persistItems preserves non-null bodies across re-crawls.
 *
 *   npx tsx scripts/regwatch-bodies-backfill.ts [slug]
 */

const SKIP = new Set(["sa-saso"]);
const UA = "vantage-intelle/1.0 (compliance monitoring; +https://intelle.io)";
const MAX = 400_000;
const DELAY = 350;
const MIN_TEXT = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const svc = createServiceClient();

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function toHtml(text: string): string {
  const paras = text.split(/\n{1,}/).map((p) => p.trim()).filter((p) => p.length > 1);
  let html = paras.map((p) => `<p>${esc(p)}</p>`).join("\n");
  if (html.length > MAX) html = html.slice(0, MAX) + "\n<p>…(truncated — see the source)</p>";
  return html;
}

async function fetchText(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/json,application/pdf,application/xhtml+xml" },
    signal: AbortSignal.timeout(30_000),
    redirect: "follow",
  });
}

/** Federal Register → JSON API (clean abstract + the rule's raw text). */
async function extractFederalRegister(docNum: string): Promise<string | null> {
  const api = `https://www.federalregister.gov/api/v1/documents/${docNum}.json?fields[]=abstract&fields[]=raw_text_url`;
  const res = await fetchText(api);
  if (!res.ok) return null;
  const j = (await res.json()) as { abstract?: string; raw_text_url?: string };
  const parts: string[] = [];
  if (j.abstract) parts.push(j.abstract);
  if (j.raw_text_url) {
    const rt = await fetchText(j.raw_text_url);
    if (rt.ok) {
      let t = await rt.text();
      const pre = t.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (pre) t = pre[1];
      t = t
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
        .replace(/[ \t]+\n/g, "\n").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
      if (t.length > 200) parts.push(t);
    }
  }
  return parts.join("\n\n");
}

/**
 * EUR-Lex → reconstruct the CELEX id from the ELI path, then fetch the document
 * from the Publications Office "Cellar" content-negotiation endpoint. The
 * eur-lex.europa.eu HTML views return HTTP 202 + empty body to non-browser
 * clients (bot mitigation); Cellar is the official machine-access route.
 */
async function extractEurLex(url: string): Promise<string | null> {
  let celex: string | null = null;
  const eli = url.match(/eli\/(reg|dir|dec)\/(\d{4})\/(\d+)/i);
  if (eli) {
    const t = eli[1].toLowerCase() === "reg" ? "R" : eli[1].toLowerCase() === "dir" ? "L" : "D";
    celex = `3${eli[2]}${t}${eli[3].padStart(4, "0")}`;
  } else {
    const c = url.match(/CELEX[:%]?3?A?([0-9A-Z]+)/i);
    if (c) celex = c[1];
  }
  if (!celex) return null;
  const res = await fetch(`http://publications.europa.eu/resource/celex/${celex}`, {
    headers: { "User-Agent": UA, Accept: "application/xhtml+xml", "Accept-Language": "en" },
    signal: AbortSignal.timeout(30_000),
    redirect: "follow",
  });
  if (!res.ok) return null;
  const html = await res.text();
  const cleaned = html
    .replace(/<head[\s\S]*?<\/head>/i, " ")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, "\n")
    .replace(/<br[^>]*>/gi, "\n");
  return cleaned
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "’").replace(/&rsquo;/g, "’")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

async function extractFromUrl(url: string): Promise<string | null> {
  const fr = url.match(/federalregister\.gov\/documents\/\d+\/\d+\/\d+\/([^/?#]+)/);
  if (fr) return await extractFederalRegister(fr[1]);
  if (/eur-lex\.europa\.eu/i.test(url)) return await extractEurLex(url);

  const res = await fetchText(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  const isPdf = ct.includes("pdf") || /\.pdf($|\?)/i.test(url);
  if (isPdf) {
    const buf = new Uint8Array(await res.arrayBuffer());
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    const joined = Array.isArray(text) ? text.join("\n") : text ?? "";
    return joined.replace(/\n{3,}/g, "\n\n").trim();
  }
  return extractMainText(await res.text());
}

async function main() {
  const onlySlug = process.argv[2];
  const regs = await svc.from("regulators").select("id, slug, name").order("slug");
  let grandOk = 0, grandEmpty = 0, grandFail = 0, grandHtml = 0;

  for (const r of regs.data ?? []) {
    if (SKIP.has(r.slug)) continue;
    if (onlySlug && r.slug !== onlySlug) continue;

    // Pass A — items with no body_text at all: fetch + extract.
    const { data: empties } = await svc
      .from("regulatory_items")
      .select("id, citation, source_url")
      .eq("regulator_id", r.id)
      .is("body_text", null)
      .limit(1000);

    // Pass B — items with body_text but no body_html: wrap (no fetch).
    const { data: textOnly } = await svc
      .from("regulatory_items")
      .select("id, body_text")
      .eq("regulator_id", r.id)
      .not("body_text", "is", null)
      .is("body_html", null)
      .limit(1000);

    if (!empties?.length && !textOnly?.length) continue;
    console.log(`\n=== ${r.slug} (${empties?.length ?? 0} to fetch, ${textOnly?.length ?? 0} to wrap) ===`);

    let ok = 0, empty = 0, fail = 0;
    for (const it of empties ?? []) {
      const url = it.source_url as string;
      if (!url) { empty++; continue; }
      try {
        const text = await extractFromUrl(url);
        if (!text || text.length < MIN_TEXT) { empty++; await sleep(DELAY); continue; }
        const upd = await svc.from("regulatory_items").update({
          body_text: text.slice(0, MAX),
          body_html: toHtml(text),
          enrichment_metadata: { body_fetched_at: new Date().toISOString(), body_source: "generic-backfill" },
        }).eq("id", it.id);
        if (upd.error) { fail++; } else ok++;
      } catch (e) {
        fail++;
        if (fail <= 2) console.log(`  ${it.citation}: ${(e as Error).message}`);
      }
      await sleep(DELAY);
    }

    let wrapped = 0;
    for (const it of textOnly ?? []) {
      const html = toHtml(it.body_text as string);
      const upd = await svc.from("regulatory_items").update({ body_html: html }).eq("id", it.id);
      if (!upd.error) wrapped++;
    }

    console.log(`  fetched: ${ok} ok, ${empty} empty, ${fail} failed | wrapped: ${wrapped}`);
    grandOk += ok; grandEmpty += empty; grandFail += fail; grandHtml += wrapped;
  }

  console.log(`\n✓ done — fetched ${grandOk}, empty ${grandEmpty}, failed ${grandFail}, html-wrapped ${grandHtml}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
