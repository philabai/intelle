/* eslint-disable no-console */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { TEMPLATE_REGISTRY } from "../src/lib/regwatch/templates/registry";

/**
 * Regenerate supabase/migrations/20260626_regwatch_internal_doc_template_seed.sql
 * from the TS template registry.
 *
 *   npm run regen-template-seed
 *
 * Re-running is safe: the migration uses `insert ... on conflict do update`
 * so the table converges to whatever the registry currently says. Templates
 * that have been removed from the registry are NOT auto-deleted — they get
 * flipped to `active = false` in a follow-up update statement so existing
 * docs that reference them by key keep working.
 */

const HEADER = `-- ===========================================================================
-- RegWatch — Internal Document Template registry seed
-- ---------------------------------------------------------------------------
-- GENERATED FILE — do not edit by hand. Regenerate via:
--
--   npm run regen-template-seed
--
-- Source of truth: src/lib/regwatch/templates/registry.ts
-- ===========================================================================

`;

const FOOTER = `

-- Deactivate any template rows whose key is no longer in the registry.
update regwatch.internal_document_templates
   set active = false,
       updated_at = now()
 where key not in (
__ACTIVE_KEYS__
 );
`;

function escapeSqlText(s: string): string {
  return s.replace(/'/g, "''");
}

function jsonLit(value: unknown): string {
  // Escape single quotes inside the JSON string itself so the resulting
  // SQL literal is well-formed.
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function buildUpsert(): string {
  const rows = TEMPLATE_REGISTRY.map(
    (t) => `  (
    '${escapeSqlText(t.key)}',
    '${escapeSqlText(t.label)}',
    '${escapeSqlText(t.description)}',
    '${escapeSqlText(t.family)}',
    '${escapeSqlText(t.kind)}',
    ${jsonLit(t.prosemirrorJson)},
    ${jsonLit(t.defaultMetadata)},
    ${t.sortOrder}
  )`,
  ).join(",\n");

  return `insert into regwatch.internal_document_templates
  (key, label, description, family, doc_kind, prosemirror_json, default_metadata, sort_order)
values
${rows}
on conflict (key) do update set
  label             = excluded.label,
  description       = excluded.description,
  family            = excluded.family,
  doc_kind          = excluded.doc_kind,
  prosemirror_json  = excluded.prosemirror_json,
  default_metadata  = excluded.default_metadata,
  sort_order        = excluded.sort_order,
  active            = true,
  updated_at        = now();`;
}

function buildActiveKeyList(): string {
  return TEMPLATE_REGISTRY.map((t) => `   '${escapeSqlText(t.key)}'`).join(",\n");
}

function main() {
  const sql =
    HEADER +
    buildUpsert() +
    FOOTER.replace("__ACTIVE_KEYS__", buildActiveKeyList());

  const outPath = join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260626_regwatch_internal_doc_template_seed.sql",
  );
  writeFileSync(outPath, sql);
  console.log(
    `[seed-internal-doc-templates] wrote ${TEMPLATE_REGISTRY.length} templates to ${outPath}`,
  );
}

main();
