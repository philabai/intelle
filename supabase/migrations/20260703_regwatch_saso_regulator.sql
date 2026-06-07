-- ===========================================================================
-- Vantage — SASO regulator seed
-- ---------------------------------------------------------------------------
-- Adds the Saudi Standards, Metrology and Quality Organization as a real
-- publisher row so the SASO connector (PR-E) has a regulator_id to write
-- against and the Discover landing's Saudi card lights up.
-- ===========================================================================

insert into regwatch.regulators
  (slug, name, short_name, jurisdiction_code, jurisdiction_name, region, regulator_type, canonical_url, description, topic_domains)
values
  ('sa-saso',
   'Saudi Standards, Metrology and Quality Organization',
   'SASO',
   'SA',
   'Saudi Arabia',
   'mea',
   'standards-body',
   'https://www.saso.gov.sa',
   'National standards body for the Kingdom of Saudi Arabia — issues technical regulations, mandatory and voluntary standards, GSO-aligned conformity requirements across food, chemicals, energy, electronics, vehicles, toys, cosmetics, and construction materials.',
   '{standards,gulf,gcc-alignment,energy,chemicals,worker-safety}'::text[])
on conflict (slug) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      jurisdiction_name = excluded.jurisdiction_name,
      region = excluded.region,
      regulator_type = excluded.regulator_type,
      canonical_url = excluded.canonical_url,
      description = excluded.description,
      topic_domains = excluded.topic_domains;
