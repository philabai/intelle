-- ===========================================================================
-- Vantage — US CFR Title 21 (Food and Drugs) publisher seed
-- ---------------------------------------------------------------------------
-- Title 21 spans the FDA (Chapter I), the DEA (Chapter II) and the Office of
-- National Drug Control Policy (Chapter III). Modelled as one publisher so the
-- ecfr-title-21 connector can write its Part items + hierarchy.
-- ===========================================================================

insert into regwatch.regulators
  (slug, name, short_name, jurisdiction_code, jurisdiction_name, region, regulator_type, canonical_url, description, topic_domains)
values
  ('us-cfr-21',
   'Code of Federal Regulations — Title 21 (Food and Drugs)',
   '21 CFR',
   'US',
   'United States',
   'na',
   'authority',
   'https://www.ecfr.gov/current/title-21',
   'Title 21 of the U.S. Code of Federal Regulations — Food and Drugs. Covers the Food and Drug Administration (food safety, human and animal drugs, biologics, medical devices, cosmetics, tobacco, radiation-emitting products) and the Drug Enforcement Administration. Sourced from eCFR.',
   '{food-safety,drugs,medical-devices,cosmetics,tobacco,chemicals,permitting,reporting}'::text[])
on conflict (slug) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      jurisdiction_name = excluded.jurisdiction_name,
      region = excluded.region,
      regulator_type = excluded.regulator_type,
      canonical_url = excluded.canonical_url,
      description = excluded.description,
      topic_domains = excluded.topic_domains;
