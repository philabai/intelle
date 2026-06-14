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
- PRESERVE simple placeholders EXACTLY: {count}, {name}, {email}, {org}, {date}, %s — never translate or reorder them.
- PRESERVE any XML-like markup tags EXACTLY (e.g. <grad>…</grad>, <emph>…</emph>, <link>…</link>, <strong>…</strong>, <bold>…</bold>, <code>…</code>, <path>…</path>, <searchLink>…</searchLink>): keep the tag names verbatim, translate ONLY the visible text between them.
- For ICU plural/select syntax like {count, plural, one{# item} other{# items}}: keep the structure and the leading variable + "plural,", keep the literal #, translate ONLY the text inside each {…} category, and use the CORRECT plural categories for ${language} (French: one, other; Arabic: zero, one, two, few, many, other — provide all that apply).
- Match a concise, professional product-UI tone; keep button/label brevity.
- Keep brand names (intelle.io, Vantage, Iris) untranslated.
- For Arabic, use Modern Standard Arabic suitable for a professional product.
- Return ONLY a JSON object, same keys, translated values. No prose.`;
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: sys,
    messages: [{ role: "user", content: JSON.stringify(payload, null, 2) }],
  });
  const text = msg.content.find((b) => b.type === "text")?.text ?? "{}";
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(json);
}

/** Run a batch with retries; the model occasionally emits malformed JSON
 * (unescaped char in a value, or truncation). Retry a few times, then give
 * up on this batch and let the caller continue — never abort the whole run. */
async function translateBatchSafe(entries, language, label) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await translateBatch(entries, language);
    } catch (e) {
      console.warn(`  ${label} attempt ${attempt} failed: ${e.message}`);
    }
  }
  // Last resort: translate one key at a time so a single bad value can't
  // sink the surrounding keys.
  const out = {};
  for (const [k, v] of entries) {
    for (let a = 1; a <= 2; a++) {
      try { Object.assign(out, await translateBatch([[k, v]], language)); break; }
      catch (e) { if (a === 2) console.warn(`  drop ${k}: ${e.message}`); }
    }
  }
  return out;
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
    // Chunk to keep each request bounded. Arabic is token-heavy and more
    // prone to malformed output, so use smaller chunks for it.
    const SIZE = t === "ar" ? 35 : 60;
    let filled = 0;
    for (let i = 0; i < missing.length; i += SIZE) {
      const chunk = missing.slice(i, i + SIZE);
      const out = await translateBatchSafe(chunk, LANG[t], `${t} batch ${i}-${i + chunk.length}`);
      for (const [k] of chunk) {
        if (out[k] != null) {
          setDeep(target, k, out[k]);
          review[k] = "needs-review";
          filled++;
        }
      }
      // Persist after every chunk so a later failure never loses progress.
      writeFileSync(targetPath, JSON.stringify(target, null, 2) + "\n");
      writeFileSync(reviewPath, JSON.stringify(review, null, 2) + "\n");
      console.log(`  ${t}: ${filled}/${missing.length} filled…`);
    }
    console.log(`${t}: wrote ${targetPath} (+${Object.keys(review).length} to review)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
