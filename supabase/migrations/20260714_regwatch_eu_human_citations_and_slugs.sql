-- ===========================================================================
-- Vantage — Human-readable EU citations + clean slugs (drop CELEX from URLs)
-- ---------------------------------------------------------------------------
-- EU rows crawled by the eur-lex connector ended up with:
--   citation = "CELEX:32026D0723"   (machine-readable but unfriendly)
--   slug     = "celex-32026d0723"   (URL has 'celex' in it — user dislike)
--
-- This migration rewrites both into the seed convention so:
--   citation = "Decision (EU) 2026/723"
--   slug     = "eu-dec-2026-723"
--
-- CELEX type letter → slug prefix:
--   R Regulation     → eu-reg-YYYY-N
--   L Directive      → eu-dir-YYYY-N
--   D Decision       → eu-dec-YYYY-N
--   H Recommendation → eu-rec-YYYY-N
--   C Communication  → eu-com-YYYY-N
--   X Notice         → eu-notice-YYYY-N
-- Number digits are unpadded via ::int cast so /eli/reg/2024/1787, not 01787.
--
-- After this:
--   - Existing seed rows with citation "Regulation (EU) 2024/1787" + slug
--     "eu-2024-1787" stay the same; their slugs ALSO migrate to the
--     "eu-reg-2024-1787" form so the URL pattern is consistent.
--   - Connector-crawled rows with "CELEX:..." citations get the human form.
--
-- 301 redirects from the old slug paths aren't needed because the only
-- external-link surface (the corpus search) regenerates href from the
-- current slug on every render.
-- ===========================================================================

-- 1. CELEX-citation rows → human citation + new slug
update regwatch.regulatory_items
   set
     citation = case substring(citation from 'CELEX:3\d{4}([A-Z])')
                  when 'R' then 'Regulation (EU) '
                  when 'L' then 'Directive (EU) '
                  when 'D' then 'Decision (EU) '
                  when 'H' then 'Recommendation (EU) '
                  when 'C' then 'Communication (EU) '
                  when 'X' then 'Notice (EU) '
                  else 'EU Act '
                end
                || substring(citation from 'CELEX:3(\d{4})[A-Z]')
                || '/'
                || (substring(citation from 'CELEX:3\d{4}[A-Z]0*(\d+)')::int)::text,
     slug = 'eu-'
            || case substring(citation from 'CELEX:3\d{4}([A-Z])')
                 when 'R' then 'reg'
                 when 'L' then 'dir'
                 when 'D' then 'dec'
                 when 'H' then 'rec'
                 when 'C' then 'com'
                 when 'X' then 'notice'
                 else 'act'
               end
            || '-'
            || substring(citation from 'CELEX:3(\d{4})[A-Z]')
            || '-'
            || (substring(citation from 'CELEX:3\d{4}[A-Z]0*(\d+)')::int)::text
 where citation ~ '^CELEX:3\d{4}[A-Z]\d+';

-- 2. Seed-style rows ("Regulation (EU) YYYY/N" with old "eu-YYYY-N" slug)
--    get the new "eu-{type}-YYYY-N" slug for URL consistency.
update regwatch.regulatory_items
   set slug = 'eu-'
              || case substring(citation from '^(\w+)\s+\(EU\)')
                   when 'Regulation' then 'reg'
                   when 'Directive' then 'dir'
                   when 'Decision' then 'dec'
                   when 'Recommendation' then 'rec'
                   when 'Communication' then 'com'
                   when 'Notice' then 'notice'
                   else 'act'
                 end
              || '-'
              || substring(citation from '\(EU\)\s+(\d{4})/')
              || '-'
              || (substring(citation from '\(EU\)\s+\d{4}/0*(\d+)')::int)::text
 where jurisdiction_code = 'EU'
   and citation ~ '^(Regulation|Directive|Decision|Recommendation|Communication|Notice)\s+\(EU\)\s+\d{4}/\d+'
   and slug !~ '^eu-(reg|dir|dec|rec|com|notice|act)-\d{4}-\d+';

-- 3. Sanity print
do $$
declare
  rec record;
begin
  raise notice '--- EU citation / slug sample after rewrite ---';
  for rec in
    select citation, slug, source_url
      from regwatch.regulatory_items
     where jurisdiction_code = 'EU'
     order by last_changed_at desc
     limit 6
  loop
    raise notice 'citation=% slug=%  source=%', rec.citation, rec.slug, rec.source_url;
  end loop;
end $$;
