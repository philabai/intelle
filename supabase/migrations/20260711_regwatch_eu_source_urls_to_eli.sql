-- ===========================================================================
-- Vantage — Convert EU regulation source URLs to the stable ELI format
-- ---------------------------------------------------------------------------
-- The 20260605 seed wrote EUR-Lex URLs in the
-- /legal-content/EN/TXT/?uri=CELEX:32024R1787
-- form. That format works but routes through an EUR-Lex redirect
-- layer that occasionally returns a "Document not found" page (the
-- 404 the user observed). The W3C ELI (European Legislation
-- Identifier) format goes straight to the document and is the
-- EUR-Lex-recommended stable URL.
--
-- Mapping:
--   CELEX 3YYYYR<num>  →  /eli/reg/YYYY/<num>
--   CELEX 3YYYYL<num>  →  /eli/dir/YYYY/<num>
--   CELEX 3YYYYD<num>  →  /eli/dec/YYYY/<num>
-- Leading zeros on <num> are stripped (ELI uses unpadded numbers).
-- ===========================================================================

-- Regulations
update regwatch.regulatory_items
   set source_url = regexp_replace(
     source_url,
     '^https?://eur-lex\.europa\.eu/legal-content/[A-Z]+/[A-Z]+/\?uri=CELEX(?::|%3A)3(\d{4})R0*(\d+).*$',
     'https://eur-lex.europa.eu/eli/reg/\1/\2'
   )
 where source_url ~ 'eur-lex\.europa\.eu/legal-content/[A-Z]+/[A-Z]+/\?uri=CELEX(?::|%3A)3\d{4}R\d+';

-- Directives
update regwatch.regulatory_items
   set source_url = regexp_replace(
     source_url,
     '^https?://eur-lex\.europa\.eu/legal-content/[A-Z]+/[A-Z]+/\?uri=CELEX(?::|%3A)3(\d{4})L0*(\d+).*$',
     'https://eur-lex.europa.eu/eli/dir/\1/\2'
   )
 where source_url ~ 'eur-lex\.europa\.eu/legal-content/[A-Z]+/[A-Z]+/\?uri=CELEX(?::|%3A)3\d{4}L\d+';

-- Decisions
update regwatch.regulatory_items
   set source_url = regexp_replace(
     source_url,
     '^https?://eur-lex\.europa\.eu/legal-content/[A-Z]+/[A-Z]+/\?uri=CELEX(?::|%3A)3(\d{4})D0*(\d+).*$',
     'https://eur-lex.europa.eu/eli/dec/\1/\2'
   )
 where source_url ~ 'eur-lex\.europa\.eu/legal-content/[A-Z]+/[A-Z]+/\?uri=CELEX(?::|%3A)3\d{4}D\d+';

-- Invalidate any cached original-document captures for these rows so
-- the Original tab refetches against the new (working) URL. Wrapped
-- in a DO block so it's a no-op when 20260702's capture columns
-- haven't been applied yet.
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
