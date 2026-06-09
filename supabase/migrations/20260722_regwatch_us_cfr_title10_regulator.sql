-- ===========================================================================
-- Vantage — US CFR Title 10 (Energy) publisher seed
-- ---------------------------------------------------------------------------
-- Title 10 of the Code of Federal Regulations spans several agencies (NRC,
-- DOE x3, NWTRB, DNFSB, the Northeast Interstate Low-Level Radioactive Waste
-- Commission). We model the whole title as ONE publisher so the eCFR
-- connector (ecfr-title-10) has a regulator_id to write the Part items +
-- hierarchy against, and so /regwatch/browse/us surfaces the Title 10 tree.
-- ===========================================================================

insert into regwatch.regulators
  (slug, name, short_name, jurisdiction_code, jurisdiction_name, region, regulator_type, canonical_url, description, topic_domains)
values
  ('us-cfr-10',
   'Code of Federal Regulations — Title 10 (Energy)',
   '10 CFR',
   'US',
   'United States',
   'na',
   'authority',
   'https://www.ecfr.gov/current/title-10',
   'Title 10 of the U.S. Code of Federal Regulations — Energy. Covers the Nuclear Regulatory Commission (reactor licensing, radiation protection, nuclear materials and security) and the Department of Energy (energy conservation standards, assistance programs, classified information), plus the NWTRB, DNFSB and the Northeast Interstate Low-Level Radioactive Waste Commission. Sourced from eCFR.',
   '{energy,nuclear,radiation,emissions,permitting,reporting,worker-safety}'::text[])
on conflict (slug) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      jurisdiction_name = excluded.jurisdiction_name,
      region = excluded.region,
      regulator_type = excluded.regulator_type,
      canonical_url = excluded.canonical_url,
      description = excluded.description,
      topic_domains = excluded.topic_domains;
