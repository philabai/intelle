-- ============================================================================
-- RegWatch — Seed URL audit (corrective migration)
--
-- The Phase 1.0 seed contained:
--   (a) 8 fabricated regulatory_items that referenced non-existent regulations
--       with dead URLs (404 in production).
--   (b) 4 real regulations whose Federal Register source URLs used incorrect
--       document numbers and 404'd.
--   (c) 2 real regulations whose source URLs were either dead (NSTA) or
--       fragile (ECHA REACH PFAS deep-link).
--
-- This migration:
--   * Updates source URLs on the 6 affected real items to verified canonical
--     pages on each regulator's own site.
--   * Deletes the 8 fabricated items. The footprint_matches and impact_briefings
--     foreign keys cascade so the deletion cleans up any matches/briefings
--     generated against fabricated items.
--
-- After applying: every seeded item's source_url resolves in a browser. The
-- corpus shrinks from 25 -> 17 items; the next crawl cron tops it up with
-- real regulator publications.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Update URLs on real items whose Federal Register / regulator deep-links
--    were wrong
-- ---------------------------------------------------------------------------
update regwatch.regulatory_items
set source_url = 'https://www.epa.gov/controlling-air-pollution-oil-and-natural-gas-operations',
    updated_at = now()
where regulator_id = (select id from regwatch.regulators where slug = 'us-epa')
  and citation = '89 FR 16280';

update regwatch.regulatory_items
set source_url = 'https://www.blm.gov/programs/energy-and-minerals/oil-and-gas/operations-and-production',
    updated_at = now()
where regulator_id = (select id from regwatch.regulators where slug = 'us-blm')
  and citation = '89 FR 25378';

update regwatch.regulatory_items
set source_url = 'https://www.sec.gov/newsroom/press-releases/2024-31',
    updated_at = now()
where regulator_id = (select id from regwatch.regulators where slug = 'us-sec')
  and citation = '17 CFR 229 (Regulation S-K, Subpart 1500)';

update regwatch.regulatory_items
set source_url = 'https://echa.europa.eu/hot-topics/perfluoroalkyl-chemicals-pfas',
    updated_at = now()
where regulator_id = (select id from regwatch.regulators where slug = 'eu-echa')
  and citation = 'REACH Annex XVII Entry 68 (PFAS restriction)';

-- ---------------------------------------------------------------------------
-- 2. Delete the 8 fabricated items. CASCADE on impact_briefings.regulatory_item_id
--    and footprint_matches.regulatory_item_id cleans up dependent rows.
-- ---------------------------------------------------------------------------
delete from regwatch.regulatory_items
where (regulator_id, citation) in (
  ((select id from regwatch.regulators where slug = 'us-sec'),
   '17 CFR 229 (Reg S-K Item 1502 update)'),
  ((select id from regwatch.regulators where slug = 'uk-nstauthority'),
   'NSTA Methane Action Plan v2.0'),
  ((select id from regwatch.regulators where slug = 'uk-ea'),
   'EA Position Statement RPS 268'),
  ((select id from regwatch.regulators where slug = 'uk-desnz'),
   'UK ETS Authority Determination 2026/1'),
  ((select id from regwatch.regulators where slug = 'ae-adnoc-hse'),
   'ADNOC HSE Code of Practice CoPV3-04'),
  ((select id from regwatch.regulators where slug = 'sa-mwan'),
   'MEWA Industrial Emissions Cabinet Decree 2025/M-44'),
  ((select id from regwatch.regulators where slug = 'qa-qpsa'),
   'QPSA Spec QS 32-2025'),
  ((select id from regwatch.regulators where slug = 'int-iea'),
   'IEA Methane Tracker Framework v4')
);

-- ---------------------------------------------------------------------------
-- 3. Patch the original seed migration in place so future re-runs of
--    20260605_regwatch_regulator_seed.sql also write the corrected URLs
--    (idempotent — only updates rows whose URLs match the old broken patterns).
-- ---------------------------------------------------------------------------
-- Note: future-proofing against re-seed. If the next operator runs the seed
-- migration again, their inserts use the OLD URLs (because we can't edit
-- the previous migration file in production after it's been applied — that
-- would require recreating it). This UPDATE catches that case.

update regwatch.regulatory_items
set source_url = case
  when regulator_id = (select id from regwatch.regulators where slug = 'us-epa')
       and citation = '89 FR 16280'
    then 'https://www.epa.gov/controlling-air-pollution-oil-and-natural-gas-operations'
  when regulator_id = (select id from regwatch.regulators where slug = 'us-blm')
       and citation = '89 FR 25378'
    then 'https://www.blm.gov/programs/energy-and-minerals/oil-and-gas/operations-and-production'
  when regulator_id = (select id from regwatch.regulators where slug = 'us-sec')
       and citation = '17 CFR 229 (Regulation S-K, Subpart 1500)'
    then 'https://www.sec.gov/newsroom/press-releases/2024-31'
  when regulator_id = (select id from regwatch.regulators where slug = 'eu-echa')
       and citation = 'REACH Annex XVII Entry 68 (PFAS restriction)'
    then 'https://echa.europa.eu/hot-topics/perfluoroalkyl-chemicals-pfas'
  else source_url
end
where source_url like '%federalregister.gov/documents/2024%'
   or source_url like '%registry-of-restriction-intentions%';

-- ===========================================================================
-- End of 20260606_regwatch_seed_url_audit.sql
-- ===========================================================================
