-- ===========================================================================
-- Vantage — Regulation translation (Arabic / French / etc. → English)
-- ---------------------------------------------------------------------------
-- For non-English source regulations (e.g. SASO Technical Regulations
-- which are Arabic-only), the Regulation reader will offer an English
-- translation tab alongside the Articles + Original tabs. The tab calls
-- a server action that:
--   1. Extracts text from the cached Original PDF via `unpdf`
--   2. Translates via Claude (technical / regulatory prompt)
--   3. Caches the result in these columns so subsequent views are fast
--
-- Source language defaults to 'en' for everything already in the
-- corpus (US Fed Register, EUR-Lex English versions, GOV.UK, etc.).
-- The SASO seed (20260709) flips its rows to 'ar' after this migration.
-- ===========================================================================

alter table regwatch.regulatory_items
  add column if not exists source_language text not null default 'en',
  add column if not exists translated_text text,
  add column if not exists translated_into text,
  add column if not exists translated_at timestamptz,
  add column if not exists translation_model text,
  add column if not exists translation_source_chars int;

create index if not exists regulatory_items_source_lang_idx
  on regwatch.regulatory_items (source_language)
  where source_language <> 'en';

-- Mark all existing SASO rows as Arabic source.
update regwatch.regulatory_items
   set source_language = 'ar'
 where regulator_id = (select id from regwatch.regulators where slug = 'sa-saso')
   and source_language = 'en';
