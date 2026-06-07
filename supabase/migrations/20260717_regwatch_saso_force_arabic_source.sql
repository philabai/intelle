-- ===========================================================================
-- Vantage — Mark every SASO regulation as Arabic-source
-- ---------------------------------------------------------------------------
-- 20260716 set source_language from the URL path (/en/ → en, /ar/ → ar)
-- assuming SASO uses the URL path to signal document language. That
-- assumption is wrong: SASO publishes PDFs in Arabic regardless of
-- which language page links to them. The user reported that the
-- Autonomous Vehicles regulation — seeded from a /en/ URL — opens as
-- an Arabic PDF, so the English-translation tab never appeared.
--
-- Fix: override every SASO row to source_language='ar'. The English
-- tab now shows on all SASO regulations and Claude translates each on
-- first viewer hit. If a specific SASO PDF turns out to already be
-- English in content, the translation step would still run but the
-- output would just be near-identical to the input — harmless.
-- ===========================================================================

update regwatch.regulatory_items
   set source_language = 'ar'
 where regulator_id = (select id from regwatch.regulators where slug = 'sa-saso')
   and source_language <> 'ar';

-- Invalidate any cached translations so they re-run with the new
-- source_language assumption. Guarded for DBs that don't have the
-- translation columns yet.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'regwatch'
       and table_name = 'regulatory_items'
       and column_name = 'translated_text'
  ) then
    execute $clear$
      update regwatch.regulatory_items
         set translated_text = null,
             translated_at = null,
             translated_into = null,
             translation_model = null
       where regulator_id = (select id from regwatch.regulators where slug = 'sa-saso')
    $clear$;
  end if;
end $$;

do $$
declare
  n int;
begin
  select count(*) into n
    from regwatch.regulatory_items
   where regulator_id = (select id from regwatch.regulators where slug = 'sa-saso')
     and source_language = 'ar';
  raise notice 'SASO rows now marked Arabic-source: %', n;
end $$;
