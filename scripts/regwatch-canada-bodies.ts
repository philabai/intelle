import { readFileSync } from "node:fs";
import { Window } from "happy-dom";

// Load .env.local
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import { createServiceClient } from "../src/lib/regwatch/supabase/service";

/**
 * Populate the Articles body for the Canadian corpus, mirroring the US CFR
 * policy (clean structured HTML in body_html + plain text in body_text; the
 * Original tab keeps the publisher's HTML page via "open at publisher").
 *
 *   - CNSC (ca-cnsc): fetch each REGDOC's published HTML page and extract the
 *     WET <main> content, sanitised to a clean subset.
 *   - CER  (ca-cer): body_text already exists from the LIMS XML; add a tidy
 *     body_html (heading + paragraphs) for the reader.
 *
 * Stamps enrichment_metadata.body_fetched_at so the body-enrich cron skips
 * these rows; persistItems already preserves non-null bodies across re-crawls.
 *
 *   npx tsx scripts/regwatch-canada-bodies.ts [cnsc|cer]
 */

const UA = "vantage-intelle/1.0 (compliance monitoring; +https://intelle.io)";
const MAX_HTML = 400_000;
const DELAY = 300;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const svc = createServiceClient();

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---- CNSC: extract + sanitise the WET main content ----
const JUNK = [
  "script", "style", "nav", "figure", "button", "form", "iframe",
  ".module-table-contents", ".gc-prtts", ".pagedetails", ".mfp-hide",
  ".wb-share", ".wb-fnote", ".pull-right", ".gc-dwnld", ".wb-disable-allow",
  "#wb-info", "#wb-bc", ".alert", ".well",
].join(",");
const ALLOWED = new Set(["H2", "H3", "H4", "H5", "P", "UL", "OL", "LI", "STRONG", "EM", "B", "I", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "A", "BR", "SUP", "SUB"]);

function cleanCnsc(html: string): { html: string; text: string } {
  const w = new Window({ url: "https://www.cnsc-ccsn.gc.ca" });
  const doc = w.document;
  doc.body.innerHTML = html;
  const main =
    doc.querySelector("main[property='mainContentOfPage']") ||
    doc.querySelector("main") ||
    doc.body;
  main.querySelectorAll(JUNK).forEach((el) => el.remove());
  // Drop the leading "View or download as a PDF" line + the page H1 (we show
  // the title separately).
  main.querySelectorAll("h1").forEach((el) => el.remove());

  // Reconstruct a clean HTML string from allowed block elements only.
  const parts: string[] = [];
  const textParts: string[] = [];
  const blocks = main.querySelectorAll("h2,h3,h4,h5,p,ul,ol,table");
  blocks.forEach((el) => {
    const tag = el.tagName;
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) return;
    if (/^view or download/i.test(text)) return;
    if (tag === "UL" || tag === "OL") {
      const lis = Array.from(el.querySelectorAll("li"))
        .map((li) => (li.textContent ?? "").replace(/\s+/g, " ").trim())
        .filter(Boolean);
      if (!lis.length) return;
      parts.push(`<${tag.toLowerCase()}>${lis.map((t) => `<li>${esc(t)}</li>`).join("")}</${tag.toLowerCase()}>`);
      textParts.push(lis.map((t) => `• ${t}`).join("\n"));
    } else if (tag === "TABLE") {
      // Keep tables simple: sanitise to bare table markup.
      const rows = Array.from(el.querySelectorAll("tr")).map((tr) => {
        const cells = Array.from(tr.querySelectorAll("th,td")).map((c) => {
          const t = (c.textContent ?? "").replace(/\s+/g, " ").trim();
          return `<${c.tagName.toLowerCase()}>${esc(t)}</${c.tagName.toLowerCase()}>`;
        });
        return `<tr>${cells.join("")}</tr>`;
      });
      if (rows.length) parts.push(`<table>${rows.join("")}</table>`);
    } else {
      const h = ALLOWED.has(tag) ? tag.toLowerCase() : "p";
      parts.push(`<${h}>${esc(text)}</${h}>`);
      textParts.push(text);
    }
  });
  w.close();
  let outHtml = parts.join("\n");
  let outText = textParts.join("\n\n");
  if (outHtml.length > MAX_HTML) {
    outHtml = outHtml.slice(0, MAX_HTML) + "\n<p>…(truncated — view the full document at the publisher)</p>";
    outText = outText.slice(0, MAX_HTML);
  }
  return { html: outHtml, text: outText };
}

async function backfillCnsc() {
  const reg = await svc.from("regulators").select("id").eq("slug", "ca-cnsc").single();
  const { data: items } = await svc
    .from("regulatory_items")
    .select("id, citation, source_url")
    .eq("regulator_id", reg.data!.id)
    .order("citation");
  console.log(`\n=== CNSC: ${items?.length ?? 0} docs ===`);
  let ok = 0, empty = 0, failed = 0;
  for (const it of items ?? []) {
    try {
      const res = await fetch(it.source_url as string, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) { failed++; console.log(`  ${it.citation}: HTTP ${res.status}`); await sleep(DELAY); continue; }
      const { html, text } = cleanCnsc(await res.text());
      if (!text || text.length < 200) { empty++; await sleep(DELAY); continue; }
      const upd = await svc.from("regulatory_items").update({
        body_html: html,
        body_text: text,
        enrichment_metadata: { body_fetched_at: new Date().toISOString(), body_source: "cnsc-html" },
      }).eq("id", it.id);
      if (upd.error) { failed++; console.log(`  ${it.citation}: ${upd.error.message}`); } else ok++;
    } catch (e) { failed++; console.log(`  ${it.citation}: ${(e as Error).message}`); }
    await sleep(DELAY);
    if ((ok + empty + failed) % 20 === 0) console.log(`  …${ok + empty + failed} processed`);
  }
  console.log(`✓ CNSC — populated ${ok}, empty ${empty}, failed ${failed}`);
}

async function backfillCer() {
  const reg = await svc.from("regulators").select("id").eq("slug", "ca-cer").single();
  const { data: items } = await svc
    .from("regulatory_items")
    .select("id, title, body_text")
    .eq("regulator_id", reg.data!.id);
  console.log(`\n=== CER: ${items?.length ?? 0} sections ===`);
  let ok = 0;
  for (const it of items ?? []) {
    const text = (it.body_text as string | null) ?? "";
    if (!text) continue;
    const paras = text.split(/\n{2,}/).map((p) => p.replace(/\n/g, " ").trim()).filter(Boolean);
    const html =
      (it.title ? `<h4>${esc(it.title as string)}</h4>\n` : "") +
      paras.map((p) => `<p>${esc(p)}</p>`).join("\n");
    const upd = await svc.from("regulatory_items").update({ body_html: html }).eq("id", it.id);
    if (!upd.error) ok++;
  }
  console.log(`✓ CER — body_html set on ${ok} sections`);
}

async function main() {
  const which = process.argv[2];
  if (!which || which === "cer") await backfillCer();
  if (!which || which === "cnsc") await backfillCnsc();
  console.log("\n✓ done");
}
main().catch((e) => { console.error(e); process.exit(1); });
