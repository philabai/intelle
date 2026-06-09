-- ===========================================================================
-- Vantage — Canada regulators seed
-- ---------------------------------------------------------------------------
-- Stands Canada up as a first-class jurisdiction by seeding its first two
-- publishers, so the connectors (CNSC scraper, CER Act XML) have a
-- regulator_id to write against and the Discover landing's Canada card lights
-- up via the regwatch.jurisdiction_summary view.
--
--   ca-cnsc — Canadian Nuclear Safety Commission (REGDOC guidance corpus)
--   ca-cer  — Canada Energy Regulator (Canadian Energy Regulator Act, C-15.1)
--
-- region 'na' (North America); regulator_type values are constrained to the
-- set documented on regwatch.regulators ('federal-agency','commission',
-- 'authority','standards-body','international-body').
-- ===========================================================================

insert into regwatch.regulators
  (slug, name, short_name, jurisdiction_code, jurisdiction_name, region, regulator_type, canonical_url, description, topic_domains)
values
  ('ca-cnsc',
   'Canadian Nuclear Safety Commission',
   'CNSC',
   'CA',
   'Canada',
   'na',
   'commission',
   'https://www.cnsc-ccsn.gc.ca',
   'Canada''s federal nuclear regulator — regulates the use of nuclear energy and materials to protect health, safety, security and the environment. Publishes the REGDOC series of regulatory documents across management systems, operations, radiation protection, safety analysis, physical security and environmental protection.',
   '{nuclear,radiation,process-safety,worker-safety,permitting}'::text[]),
  ('ca-cer',
   'Canada Energy Regulator',
   'CER',
   'CA',
   'Canada',
   'na',
   'federal-agency',
   'https://www.cer-rec.gc.ca',
   'Canada''s federal energy regulator — oversees interprovincial and international pipelines, power lines, energy trade, and offshore renewable energy projects under the Canadian Energy Regulator Act (S.C. 2019, c. 28, s. 10).',
   '{energy,pipelines,emissions,methane,permitting,reporting}'::text[])
on conflict (slug) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      jurisdiction_name = excluded.jurisdiction_name,
      region = excluded.region,
      regulator_type = excluded.regulator_type,
      canonical_url = excluded.canonical_url,
      description = excluded.description,
      topic_domains = excluded.topic_domains;
