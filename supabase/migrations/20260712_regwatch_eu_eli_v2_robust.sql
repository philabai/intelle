-- ===========================================================================
-- Vantage — Robust EU CELEX → ELI URL conversion (replaces / supplements 20260711)
-- ---------------------------------------------------------------------------
-- 20260711's regex required the URL to start with the exact form
-- `legal-content/<LANG>/<DOMAIN>/` — if the URL had any trailing
-- parameters or used a slightly different shape it wouldn't match.
-- This version uses substring() to extract just the CELEX year +
-- number, then rebuilds the URL from scratch. Robust to:
--   - any URL prefix (just needs CELEX somewhere)
--   - colon / %3A / space variants between CELEX and the number
--   - trailing query params, fragments, etc.
-- Cast through ::int drops leading zeros so /eli/reg/2024/1787 not
-- /eli/reg/2024/01787.
-- ===========================================================================

-- Regulations (R)
update regwatch.regulatory_items
   set source_url = 'https://eur-lex.europa.eu/eli/reg/'
     || substring(source_url from 'CELEX[^0-9]*3(\d{4})R')
     || '/'
     || (substring(source_url from 'CELEX[^0-9]*3\d{4}R0*(\d+)')::int)::text
 where source_url ~* 'eur-lex'
   and source_url ~ 'CELEX[^0-9]*3\d{4}R\d+'
   and source_url not like 'https://eur-lex.europa.eu/eli/%';

-- Directives (L)
update regwatch.regulatory_items
   set source_url = 'https://eur-lex.europa.eu/eli/dir/'
     || substring(source_url from 'CELEX[^0-9]*3(\d{4})L')
     || '/'
     || (substring(source_url from 'CELEX[^0-9]*3\d{4}L0*(\d+)')::int)::text
 where source_url ~* 'eur-lex'
   and source_url ~ 'CELEX[^0-9]*3\d{4}L\d+'
   and source_url not like 'https://eur-lex.europa.eu/eli/%';

-- Decisions (D)
update regwatch.regulatory_items
   set source_url = 'https://eur-lex.europa.eu/eli/dec/'
     || substring(source_url from 'CELEX[^0-9]*3(\d{4})D')
     || '/'
     || (substring(source_url from 'CELEX[^0-9]*3\d{4}D0*(\d+)')::int)::text
 where source_url ~* 'eur-lex'
   and source_url ~ 'CELEX[^0-9]*3\d{4}D\d+'
   and source_url not like 'https://eur-lex.europa.eu/eli/%';

-- Invalidate any cached original-document captures for the rewritten
-- rows so the Original tab refetches the working URL. Guarded by an
-- information_schema check so it's a no-op when 20260702's capture
-- columns aren't installed yet.
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'regwatch'
       and table_name = 'regulatory_items'
       and column_name = 'original_storage_path'
  ) then
    execute $clear$
      update regwatch.regulatory_items
         set original_storage_path = null,
             original_mime = null,
             original_size_bytes = null,
             original_captured_at = null,
             original_capture_error = null
       where source_url like 'https://eur-lex.europa.eu/eli/%'
    $clear$;
  end if;
end $$;

-- Sanity print: how many EU rows still have legacy CELEX URLs?
do $$
declare
  remaining int;
begin
  select count(*) into remaining
    from regwatch.regulatory_items
   where jurisdiction_code = 'EU'
     and source_url ~ 'CELEX[^0-9]*3\d{4}[A-Z]\d+'
     and source_url not like 'https://eur-lex.europa.eu/eli/%';
  raise notice 'EU rows still on legacy CELEX URL form: %', remaining;
end $$;
