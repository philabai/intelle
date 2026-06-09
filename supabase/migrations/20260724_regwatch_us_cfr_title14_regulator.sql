-- ===========================================================================
-- Vantage — US CFR Title 14 (Aeronautics and Space) publisher seed
-- ---------------------------------------------------------------------------
-- Title 14 spans the FAA (Chapter I), Commercial Space Transportation
-- (Chapter III) and NASA (Chapter V). Modelled as one publisher so the
-- ecfr-title-14 connector can write its Part items + hierarchy.
-- ===========================================================================

insert into regwatch.regulators
  (slug, name, short_name, jurisdiction_code, jurisdiction_name, region, regulator_type, canonical_url, description, topic_domains)
values
  ('us-cfr-14',
   'Code of Federal Regulations — Title 14 (Aeronautics and Space)',
   '14 CFR',
   'US',
   'United States',
   'na',
   'authority',
   'https://www.ecfr.gov/current/title-14',
   'Title 14 of the U.S. Code of Federal Regulations — Aeronautics and Space. Covers the Federal Aviation Administration (airworthiness, operations, airmen, airports, airspace), the Office of Commercial Space Transportation, and NASA. Sourced from eCFR.',
   '{aviation,aerospace,permitting,reporting,worker-safety,emissions}'::text[])
on conflict (slug) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      jurisdiction_name = excluded.jurisdiction_name,
      region = excluded.region,
      regulator_type = excluded.regulator_type,
      canonical_url = excluded.canonical_url,
      description = excluded.description,
      topic_domains = excluded.topic_domains;
