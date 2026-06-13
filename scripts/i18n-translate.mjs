/**
 * AI-draft translator for the next-intl message catalogs. Fills any leaf string
 * present in en.json but MISSING from fr.json / ar.json by machine-translating
 * with Claude, preserving ICU placeholders ({count}, {name}) and tone. Idempotent
 * gap-fill — re-run after adding English keys; existing translations are kept,
 * so it doubles as the ongoing sync tool.
 *
 * Drafts are marked for human review: a parallel src/messages/<locale>.review.json
 * ledger lists every key the AI filled this run. Clear entries as you proofread.
 *
 *   npx tsx scripts/i18n-translate.mjs            # all targets (fr, ar)
 *   npx tsx scripts/i18n-translate.mjs fr         # one target
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

// Load .env.local (ANTHROPIC_API_KEY).
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}

const MODEL = "claude-sonnet-4-6";
const DIR = "src/messages";
const LANG = { fr: "French", ar: "Arabic" };
const targets = process.argv.slice(2).filter((a) => a in LANG);
const TARGETS = targets.length ? targets : Object.keys(LANG);

const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {});

/** Flatten nested catalog → { "a.b.c": "value" }. */
function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
/** Set a dotted key into a nested object. */
function setDeep(obj, dotted, value) {
  const parts = dotted.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] ??= {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function translateBatch(entries, language) {
  // entries: [[key, english], ...]. Ask for a strict JSON map back.
  const payload = Object.fromEntries(entries);
  const sys = `You are a professional UI localizer for a B2B engineering-intelligence + regulatory-compliance SaaS. Translate the JSON string VALUES into ${language}. Rules:
- Keep keys identical; translate only values.
- PRESERVE any ICU/template placeholders EXACTLY: {count}, {name}, <b>…</b>, %s — never translate or reorder their tokens.
- Match a concise, professional product-UI tone; keep button/label brevity.
- Keep brand names (intelle.io, Vantage, Iris) untranslated.
- For Arabic, use Modern Standard Arabic suitable for a professional product.
- Return ONLY a JSON object, same keys, translated values. No prose.`;
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: sys,
    messages: [{ role: "user", content: JSON.stringify(payload, null, 2) }],
  });
  const text = msg.content.find((b) => b.type === "text")?.text ?? "{}";
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(json);
}

async function main() {
  const en = flatten(read(`${DIR}/en.json`));
  for (const t of TARGETS) {
    const targetPath = `${DIR}/${t}.json`;
    const target = read(targetPath);
    const have = flatten(target);
    const missing = Object.entries(en).filter(([k, v]) => typeof v === "string" && !(k in have));
    if (missing.length === 0) {
      console.log(`${t}: up to date.`);
      continue;
    }
    console.log(`${t}: translating ${missing.length} keys…`);
    const reviewPath = `${DIR}/${t}.review.json`;
    const review = read(reviewPath);
    // Chunk to keep each request bounded.
    for (let i = 0; i < missing.length; i += 60) {
      const chunk = missing.slice(i, i + 60);
      const out = await translateBatch(chunk, LANG[t]);
      for (const [k] of chunk) {
        if (out[k] != null) {
          setDeep(target, k, out[k]);
          review[k] = "needs-review";
        }
      }
    }
    writeFileSync(targetPath, JSON.stringify(target, null, 2) + "\n");
    writeFileSync(reviewPath, JSON.stringify(review, null, 2) + "\n");
    console.log(`${t}: wrote ${targetPath} (+${Object.keys(review).length} to review)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
