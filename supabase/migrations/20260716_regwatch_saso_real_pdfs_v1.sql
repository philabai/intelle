-- ===========================================================================
-- Vantage — SASO Technical Regulations (real PDF URLs, batch 1 of N)
-- ---------------------------------------------------------------------------
-- Replaces every prior SASO seed (20260705 / 20260708 / 20260709) with the
-- authoritative 12 PDFs the user shared. Each row points at the actual
-- PDF on saso.gov.sa, so the Original tab caches a real document and the
-- English tab translates a real document.
--
-- source_language is set from the URL path:
--   /en/ paths → 'en' (no translation tab)
--   /ar/ paths → 'ar' (English translation tab appears)
--
-- The user will share another 50+ PDFs once this batch verifies; the next
-- migration will be additive (no DELETE).
-- ===========================================================================

-- Wipe prior SASO seeds so the page shows ONLY the authoritative entries.
delete from regwatch.regulatory_items
 where regulator_id = (select id from regwatch.regulators where slug = 'sa-saso');

-- Ensure SASO regulator row exists.
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
   'National standards body for the Kingdom of Saudi Arabia. Issues mandatory Technical Regulations covering vehicles, machinery, communications, electrical, explosive atmospheres, watercrafts, and conformity assessment. Most documents are published in Arabic with selected English translations.',
   '{standards,gulf,gcc-alignment,energy,chemicals,worker-safety}'::text[])
on conflict (slug) do update set description = excluded.description;

with saso as (
  select id from regwatch.regulators where slug = 'sa-saso'
)
insert into regwatch.regulatory_items
  (regulator_id, citation, slug, title, instrument_type, status,
   effective_date, published_at, last_changed_at, source_url, source_mime,
   source_language, summary, jurisdiction_code, topics, enrichment_status)
select saso.id, v.citation, v.slug, v.title, 'standard', 'in-force',
       null, now(), now(),
       v.source_url, 'application/pdf', v.source_language,
       v.summary, 'SA', v.topics::text[], 'pending'
from saso, (values

  -- ---- English-language source -----------------------------------------
  ('SASO TR · Autonomous Vehicles · Standards List',
   'saso-tr-av-standards-list',
   'List of Standards Relevant to the Implementation of the Technical Regulation for Autonomous Vehicles',
   'https://www.saso.gov.sa/en/Laws-And-Regulations/Technical_regulations/Documents/List-of-Standards-Relevant-to-the-Implementation-of-the-Technical-Regulation-for-Autonomous-Vehicles.pdf',
   'en',
   'Companion list of international + national standards manufacturers must conform to when placing autonomous-vehicle products on the Saudi market under SASO''s Autonomous Vehicles Technical Regulation. English source.',
   '{standards,gcc-alignment,worker-safety}'),

  ('SASO TR · Autonomous Vehicles',
   'saso-tr-autonomous-vehicles',
   'Technical Regulation for Autonomous Vehicles',
   'https://www.saso.gov.sa/en/Laws-And-Regulations/Technical_regulations/Documents/Technical-Regulation-Autonomous-Vehicles.pdf',
   'en',
   'Mandatory type-approval, cyber-security, functional-safety and SASO conformity-mark requirements for autonomous and highly-automated vehicles sold or operated in Saudi Arabia. English source.',
   '{standards,gcc-alignment,worker-safety}'),

  -- ---- Arabic-language sources -----------------------------------------
  ('SASO TR · Tanks · Part 3 Dry Gas Transport',
   'saso-tr-tanks-part-3-dry-gas-transport',
   'Technical Regulations for Tanks — Part 3: Dry Gas Transport Tanks',
   'https://www.saso.gov.sa/ar/Laws-And-Regulations/Technical_regulations/Documents/Technical-Regulations-for-Tanks-Part3-Dry-Gas-Transport-Tanks.pdf',
   'ar',
   'Mandatory specifications for tanks used in the road transport of dry gases — construction, pressure rating, safety devices, marking + inspection. Arabic source; English machine translation available in the third tab.',
   '{standards,worker-safety,construction}'),

  ('SASO TR · Special Use Vehicle Equipment and Accessories',
   'saso-tr-special-use-vehicle-equipment',
   'Technical Regulation for Special Use Vehicle Equipment and Accessories',
   'https://www.saso.gov.sa/ar/Laws-And-Regulations/Technical_regulations/Documents/TR-Special-Use-Vehicle-Equipment-and-Accessories.pdf',
   'ar',
   'Specifications for fitted equipment + accessories on special-use vehicles (ambulances, fire engines, mobile workshops, refrigerated trucks). Arabic source.',
   '{standards,gcc-alignment,worker-safety}'),

  ('SASO TR · Communications and IT Devices',
   'saso-tr-communications-and-it-devices',
   'Technical Regulation for Communications and Information Technology Devices',
   'https://www.saso.gov.sa/ar/Laws-And-Regulations/Technical_regulations/Documents/TR-Communications-and-Information-Technology-Devices.pdf',
   'ar',
   'Mandatory EMC, RF, electrical safety and SASO conformity-mark requirements for ICT devices — mobile phones, routers, network equipment, computing hardware. Arabic source.',
   '{standards,chemicals}'),

  ('SASO TR · Machinery Safety',
   'saso-tr-machinery-safety',
   'Technical Regulation — Requirements for Machinery Safety',
   'https://www.saso.gov.sa/ar/Laws-And-Regulations/Technical_regulations/Documents/TR-Requirements-Machinery-Safety.pdf',
   'ar',
   'Essential health + safety requirements for industrial machinery placed on the Saudi market. Aligns with EU Machinery Directive 2006/42/EC. Arabic source.',
   '{standards,worker-safety}'),

  ('SASO TR · General Regulation for Conformity Models',
   'saso-tr-general-conformity-models',
   'Technical Regulation — General Regulation for Conformity Models',
   'https://www.saso.gov.sa/ar/Laws-And-Regulations/Technical_regulations/Documents/TR-General-Regulation-for-Conformity-Models.pdf',
   'ar',
   'Cross-cutting framework defining the conformity-assessment models (modules) products must follow under SASO Technical Regulations. Arabic source.',
   '{standards,gcc-alignment}'),

  ('SASO TR · Explosive Atmospheres Equipment',
   'saso-tr-explosive-atmospheres-equipment',
   'Technical Regulation — Equipment and Protective Systems Intended for Use in Potentially Explosive Atmospheres',
   'https://www.saso.gov.sa/ar/Laws-And-Regulations/Technical_regulations/Documents/TR-Equipment-and-Protective-Systems-Intended-for-Use-in-Potentially-Explosive-Atmospheres.pdf',
   'ar',
   'Saudi ATEX equivalent. Mandatory design + certification requirements for equipment used in zoned explosive atmospheres (oil & gas, refineries, petrochemicals). Arabic source.',
   '{standards,worker-safety,energy,chemicals}'),

  ('SASO TR · Electromagnetic Compatibility',
   'saso-tr-electromagnetic-compatibility',
   'Technical Regulation — Electromagnetic Compatibility',
   'https://www.saso.gov.sa/ar/Laws-And-Regulations/Technical_regulations/Documents/TR-Electromagnetic-Compatibility.pdf',
   'ar',
   'EMC emission + immunity requirements for electrical + electronic equipment placed on the Saudi market. Aligns with EU EMC Directive 2014/30/EU. Arabic source.',
   '{standards,chemicals}'),

  ('SASO TR · Cableway Installations',
   'saso-tr-cableway-installations',
   'Technical Regulation for Cableway Installations',
   'https://www.saso.gov.sa/ar/Laws-And-Regulations/Technical_regulations/Documents/Technical-Regulation-for-Cableway-Installations.pdf',
   'ar',
   'Safety + conformity requirements for cableway installations designed to transport persons (cable cars, gondola lifts, chairlifts, surface tow lifts). Arabic source.',
   '{standards,worker-safety,construction}'),

  ('SASO TR · Electrical and Electronic Equipment',
   'saso-tr-electrical-electronic-equipment',
   'Technical Regulation — Requirements for Electrical and Electronic Equipment',
   'https://www.saso.gov.sa/ar/Laws-And-Regulations/Technical_regulations/Documents/TR-Requirements-Electrical-Electronic-Equipment.pdf',
   'ar',
   'Mandatory safety, energy-efficiency, marking + conformity-assessment requirements for electrical and electronic equipment sold in Saudi Arabia. Arabic source.',
   '{standards,worker-safety,energy}'),

  ('SASO TR · Watercrafts',
   'saso-tr-watercrafts',
   'Technical Regulation for Watercrafts',
   'https://www.saso.gov.sa/ar/Laws-And-Regulations/Technical_regulations/Documents/TR-Watercrafts.pdf',
   'ar',
   'Type-approval, safety, marking + conformity requirements for recreational + small commercial watercraft sold or operated in Saudi Arabian waters. Arabic source.',
   '{standards,worker-safety,gcc-alignment}')

) as v(citation, slug, title, source_url, source_language, summary, topics);
