-- ===========================================================================
-- Vantage — Predict SASO Technical Regulation PDF URLs from titles
-- ---------------------------------------------------------------------------
-- The user shared one real PDF URL:
--   https://www.saso.gov.sa/en/Laws-And-Regulations/Technical_regulations/Documents/Technical-Regulation-Autonomous-Vehicles.pdf
--
-- Pattern:
--   Base: https://www.saso.gov.sa/en/Laws-And-Regulations/Technical_regulations/Documents/
--   File: Technical-Regulation-<Title-with-prefix-stripped-and-spaces-hyphenated>.pdf
--
-- This migration updates every seeded SASO row's source_url to the
-- predicted PDF URL based on its title. Strips "Technical Regulation
-- for " prefix, normalises whitespace + em-dashes + ampersands.
--
-- Predicted URLs that 404 will need manual correction once we have
-- the user's authoritative PDF list (the SASO scraper can't introspect
-- the live HTML, so deterministic title→URL mapping is the best we
-- can do).
-- ===========================================================================

update regwatch.regulatory_items
   set source_url = 'https://www.saso.gov.sa/en/Laws-And-Regulations/Technical_regulations/Documents/Technical-Regulation-'
     || regexp_replace(
       regexp_replace(
         regexp_replace(
           -- Strip "Technical Regulation for " or "Technical Regulation of " prefix
           regexp_replace(title, '^Technical Regulation (?:for|of)\s+', '', 'i'),
           -- Normalise em-dash / en-dash to a plain hyphen with surrounding spaces collapsed
           '\s*[—–]\s*', ' ', 'g'
         ),
         -- Ampersand → 'and'
         '\s*&\s*', ' and ', 'g'
       ),
       -- Whitespace runs → single hyphen
       '\s+', '-', 'g'
     )
     || '.pdf',
       source_mime = 'application/pdf'
 where regulator_id = (select id from regwatch.regulators where slug = 'sa-saso')
   -- Only touch rows that still have the placeholder index URL
   and source_url like '%Technical_regulations/pages/default.aspx';

-- Invalidate any cached original-document captures for these rows so
-- the Original tab refetches against the new URLs. Guarded for
-- DBs that don't have 20260702 applied yet.
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
             original_capture_error = null,
             translated_text = null,
             translated_at = null,
             translation_model = null
       where regulator_id = (select id from regwatch.regulators where slug = 'sa-saso')
    $clear$;
  end if;
end $$;

-- Sanity output: how many SASO rows got updated, what the URLs look like
do $$
declare
  rec record;
begin
  for rec in
    select citation, source_url
      from regwatch.regulatory_items
     where regulator_id = (select id from regwatch.regulators where slug = 'sa-saso')
     order by citation
     limit 5
  loop
    raise notice 'SASO % → %', rec.citation, rec.source_url;
  end loop;
end $$;
