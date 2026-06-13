import { readFileSync } from "node:fs";
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
}
import { runInternalDocEmbedBacklog } from "../src/lib/regwatch/internal-document-embed";
import { isIntelleEmbedEnabled } from "../src/lib/llm/config";

/**
 * Backfill self-hosted intelleLLM embeddings for CUSTOMER documents so hybrid
 * company-doc search's vector lane works. Embeds the current revision of every
 * non-retired document that lacks embeddings; idempotent (skips already-embedded
 * revisions). Requires INTELLELLM_ENABLED=true + the INTELLE_EMBED_* vars.
 *
 *   npx tsx scripts/regwatch-internal-doc-embed-backfill.ts [--batch N] [--rounds N]
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function argNum(flag: string, def: number): number {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? parseInt(process.argv[i + 1], 10) || def : def;
}

async function main() {
  if (!isIntelleEmbedEnabled()) {
    console.error(
      "intelleLLM embeddings are not enabled. Set INTELLELLM_ENABLED=true and INTELLE_EMBED_BASE_URL/MODEL in .env.local first.",
    );
    process.exit(1);
  }
  const batch = argNum("--batch", 10);
  const rounds = argNum("--rounds", 1000);
  let totalDocs = 0;
  let totalChunks = 0;
  for (let r = 0; r < rounds; r++) {
    const res = await runInternalDocEmbedBacklog(batch);
    totalDocs += res.embeddedDocs;
    totalChunks += res.chunks;
    if (res.errors.length) {
      for (const e of res.errors) console.error("  !", e);
    }
    console.log(
      `round ${r + 1}: considered ${res.considered}, embedded ${res.embeddedDocs} docs / ${res.chunks} chunks, failed ${res.failed}`,
    );
    // Done when a round found nothing new to embed.
    if (res.considered === 0) break;
    await sleep(500);
  }
  console.log(`\n✓ done — ${totalDocs} documents, ${totalChunks} chunks embedded.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
