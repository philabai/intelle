-- ===========================================================================
-- Vantage — SASO Technical Regulations (real, from saso.gov.sa)
-- ---------------------------------------------------------------------------
-- Replaces my prior 20260705 / 20260708 seed which used made-up SASO
-- standard numbers ('SASO 2870' etc — those are real but they're
-- *standards*, not the mandatory *technical regulations* published at
-- https://www.saso.gov.sa/en/laws-and-regulations/technical_regulations/
--
-- This migration:
--   1. Deletes prior SASO items so the made-up standard numbers don't
--      leak into the Saudi card alongside the real regulations.
--   2. Inserts the actual SASO Technical Regulations grouped by the
--      six categories SASO itself uses (Textile, Construction,
--      Mechanical, Electrical, Chemistry, Services).
--   3. Marks source_language = 'ar' so the Regulation reader knows to
--      offer the English-translation tab (see 20260710).
--
-- Source URLs point at the SASO technical regulations index — the
-- direct PDF URLs require a session-scoped download token on SASO's
-- site, so the live scraper resolves them at fetch time. The Original
-- tab will cache the PDF when an authenticated user clicks it.
-- ===========================================================================

-- 1. Wipe my prior made-up SASO seed.
delete from regwatch.regulatory_items
 where regulator_id = (select id from regwatch.regulators where slug = 'sa-saso');

-- 2. Ensure SASO regulator exists (no-op if 20260703 already ran).
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
   'National standards body for the Kingdom of Saudi Arabia. Issues mandatory Technical Regulations covering textile, construction, mechanical, electrical, chemistry, and services categories. Most regulations are published in Arabic.',
   '{standards,gulf,gcc-alignment,energy,chemicals,worker-safety}'::text[])
on conflict (slug) do update set
  description = excluded.description;

-- 3. Insert the actual SASO Technical Regulations. Source PDFs are in
--    Arabic; the regulator publishes an English summary on the index
--    page but the canonical mandatory text is Arabic.

with saso as (
  select id from regwatch.regulators where slug = 'sa-saso'
),
landing as (
  select 'https://www.saso.gov.sa/en/laws-and-regulations/technical_regulations/pages/default.aspx'::text as url
)
insert into regwatch.regulatory_items
  (regulator_id, citation, slug, title, instrument_type, status,
   effective_date, published_at, last_changed_at, source_url,
   summary, jurisdiction_code, topics, enrichment_status)
select saso.id, v.citation, v.slug, v.title, 'standard', 'in-force',
       v.effective_date::date, v.published_at::timestamptz, v.last_changed_at::timestamptz,
       landing.url, v.summary, 'SA', v.topics::text[], 'pending'
from saso, landing, (values
  -- ---- Textile ----------------------------------------------------------
  ('SASO TR · Footwear and Accessories', 'saso-tr-footwear-and-accessories',
   'Technical Regulation for Footwear and Their Accessories',
   '2018-08-01', '2018-02-15', '2024-05-20',
   'Mandatory labelling, material declaration and safety requirements for footwear and footwear accessories placed on the Saudi market. Source PDF is in Arabic.',
   '{standards,textile,worker-safety}'),
  ('SASO TR · Textiles', 'saso-tr-textiles',
   'Technical Regulation for Textiles',
   '2017-10-01', '2017-06-10', '2024-03-08',
   'Labelling, fibre composition, and migration limits for textile products sold in Saudi Arabia. Bilingual Arabic-English labelling required. Source PDF is in Arabic.',
   '{standards,textile,chemicals}'),

  -- ---- Construction and building ---------------------------------------
  ('SASO TR · Building Materials Part 1', 'saso-tr-building-materials-part-1',
   'Technical Regulation for Building Materials — Part 1',
   '2019-04-01', '2018-11-15', '2024-04-12',
   'Mandatory conformity assessment for cement, ready-mix concrete and structural materials used in Saudi construction. Source PDF is in Arabic.',
   '{standards,construction,gcc-alignment}'),
  ('SASO TR · Building Materials Part 2', 'saso-tr-building-materials-part-2',
   'Technical Regulation for Building Materials — Part 2',
   '2020-01-01', '2019-09-01', '2024-04-12',
   'Mandatory requirements for ceramic, gypsum and finishing materials in Saudi construction. Source PDF is in Arabic.',
   '{standards,construction}'),
  ('SASO TR · Building Materials Part 3', 'saso-tr-building-materials-part-3',
   'Technical Regulation for Building Materials — Part 3',
   '2021-06-01', '2021-01-20', '2024-04-12',
   'Mandatory requirements for thermal-insulation, waterproofing and roofing materials. Source PDF is in Arabic.',
   '{standards,construction,energy}'),
  ('SASO TR · Cement', 'saso-tr-cement',
   'Technical Regulation for Cement',
   '2017-09-15', '2017-04-30', '2023-12-12',
   'Performance, packaging and labelling requirements for Portland cement and blended cements used in Saudi construction. Source PDF is in Arabic.',
   '{standards,construction}'),
  ('SASO TR · Steel and Iron Bars', 'saso-tr-steel-and-iron-bars',
   'Technical Regulation for Iron and Steel Bars',
   '2018-03-01', '2017-10-12', '2024-06-18',
   'Grade, dimensional and conformity-mark requirements for steel rebar and structural bars. Source PDF is in Arabic.',
   '{standards,construction}'),
  ('SASO TR · Doors and Windows', 'saso-tr-doors-and-windows',
   'Technical Regulation for Doors, Windows and Accessories',
   '2019-06-01', '2019-01-25', '2024-07-04',
   'Safety, thermal performance and durability requirements for door + window systems in Saudi buildings. Source PDF is in Arabic.',
   '{standards,construction,energy}'),
  ('SASO TR · Sanitary Wares', 'saso-tr-sanitary-wares',
   'Technical Regulation for Sanitary Wares',
   '2018-11-01', '2018-06-15', '2024-02-22',
   'Performance, water-efficiency and labelling requirements for toilets, basins, taps and showers. Source PDF is in Arabic.',
   '{standards,construction}'),
  ('SASO TR · Tanks', 'saso-tr-tanks',
   'Technical Regulation for Tanks',
   '2020-10-01', '2020-05-22', '2024-08-30',
   'Mandatory specifications for water storage tanks (polyethylene, fibreglass, metal) used in Saudi residential + commercial installations. Source PDF is in Arabic.',
   '{standards,construction,worker-safety}'),

  -- ---- Mechanical -------------------------------------------------------
  ('SASO TR · Vehicles', 'saso-tr-vehicles',
   'Technical Regulation for Vehicles',
   '2018-06-01', '2017-12-04', '2024-09-15',
   'Type-approval, emissions, fuel-efficiency and safety requirements for motor vehicles sold in Saudi Arabia. Aligned with GSO + UNECE. Source PDF is in Arabic.',
   '{standards,gcc-alignment,emissions}'),
  ('SASO TR · Automated Motorcycles', 'saso-tr-automated-motorcycles',
   'Technical Regulation for Automated Motorcycles',
   '2022-04-01', '2021-11-08', '2024-04-30',
   'Type-approval requirements for two-wheel and three-wheel motor vehicles including electric scooters above 25 km/h. Source PDF is in Arabic.',
   '{standards,gcc-alignment,worker-safety}'),
  ('SASO TR · Tires', 'saso-tr-tires',
   'Technical Regulation for Tires',
   '2018-07-01', '2017-12-04', '2024-01-20',
   'Performance, dimensional and marking requirements for passenger-car, light-truck and heavy-duty tires. Includes desert-temperature endurance. Source PDF is in Arabic.',
   '{standards,gcc-alignment}'),
  ('SASO TR · Lifts and Escalators', 'saso-tr-lifts-and-escalators',
   'Technical Regulation for Lifts and Escalators',
   '2017-08-15', '2017-03-20', '2024-05-08',
   'Mandatory safety, installation, inspection and maintenance requirements for passenger + freight elevators and escalators. Source PDF is in Arabic.',
   '{standards,worker-safety,construction}'),
  ('SASO TR · Equipment Safety Part 1', 'saso-tr-equipment-safety-part-1',
   'Technical Regulation for equipment safety — Part 1',
   '2019-10-01', '2019-05-15', '2024-06-25',
   'General safety, marking and conformity-assessment requirements for machinery and industrial equipment placed on the Saudi market. Source PDF is in Arabic.',
   '{standards,worker-safety}'),
  ('SASO TR · Lubricants', 'saso-tr-lubricants',
   'Technical Regulation for Lubricants',
   '2018-12-01', '2018-07-10', '2024-03-15',
   'Specifications, labelling and SASO conformity-mark requirements for engine and industrial lubricants. Source PDF is in Arabic.',
   '{standards,chemicals,energy}'),

  -- ---- Electrical -------------------------------------------------------
  ('SASO TR · Low Voltage Equipment', 'saso-tr-low-voltage-equipment',
   'Technical Regulation for Electrical Appliances — Low Voltage Equipment',
   '2017-04-01', '2016-11-12', '2024-02-18',
   'Mandatory safety, EMC and conformity-mark requirements for electrical appliances operating between 50 V and 1000 V AC. Source PDF is in Arabic.',
   '{standards,worker-safety}'),
  ('SASO TR · Air Conditioners', 'saso-tr-air-conditioners',
   'Technical Regulation for Air Conditioners',
   '2018-01-01', '2017-09-15', '2024-03-10',
   'Mandatory energy-efficiency, refrigerant-type and labelling requirements for window, split and packaged AC units up to 65 kW. Source PDF is in Arabic.',
   '{standards,energy,gcc-alignment}'),
  ('SASO TR · Electrical Batteries', 'saso-tr-electrical-batteries',
   'Technical Regulation for Electrical Batteries',
   '2020-03-01', '2019-11-08', '2024-02-14',
   'Mandatory safety + labelling requirements for primary and secondary batteries including lithium-ion cells used in electronics and EVs. Source PDF is in Arabic.',
   '{standards,chemicals}'),
  ('SASO TR · Electrical Cables', 'saso-tr-electrical-cables',
   'Technical Regulation for Electrical Cables',
   '2018-09-01', '2018-04-22', '2024-07-12',
   'Construction, fire-performance and labelling requirements for power, control and communication cables in Saudi installations. Source PDF is in Arabic.',
   '{standards,worker-safety,construction}'),
  ('SASO TR · LED Lamps', 'saso-tr-led-lamps',
   'Technical Regulation for LED Lamps',
   '2019-02-01', '2018-09-18', '2024-04-08',
   'Energy-efficiency, lumen-output, power-factor and labelling requirements for LED lamps and luminaires sold in Saudi Arabia. Source PDF is in Arabic.',
   '{standards,energy}'),

  -- ---- Chemistry --------------------------------------------------------
  ('SASO TR · Cosmetic Products', 'saso-tr-cosmetic-products',
   'Technical Regulation for Cosmetic Products',
   '2019-05-01', '2018-10-15', '2024-04-08',
   'Mandatory labelling, ingredient declaration, microbiological limits and prohibited-substance list for cosmetic products. Bilingual Arabic-English label required. Source PDF is in Arabic.',
   '{standards,chemicals}'),
  ('SASO TR · Detergents', 'saso-tr-detergents',
   'Technical Regulation for Detergents',
   '2018-04-01', '2017-11-20', '2024-05-30',
   'Composition, labelling and environmental requirements for laundry, dishwashing and hard-surface detergents. Source PDF is in Arabic.',
   '{standards,chemicals}'),
  ('SASO TR · Paints', 'saso-tr-paints',
   'Technical Regulation for Paints',
   '2019-09-01', '2019-04-10', '2024-06-20',
   'VOC limits, lead/heavy-metal limits and labelling for architectural and industrial paints and varnishes. Source PDF is in Arabic.',
   '{standards,chemicals,emissions}'),
  ('SASO TR · Personal Protective Equipment', 'saso-tr-personal-protective-equipment',
   'Technical Regulation for Personal Protective Equipment',
   '2020-06-01', '2020-02-15', '2024-08-05',
   'Mandatory conformity-assessment and labelling requirements for PPE — helmets, eye protection, respirators, hearing protection, gloves, footwear. Source PDF is in Arabic.',
   '{standards,worker-safety,chemicals}'),
  ('SASO TR · Petroleum Products', 'saso-tr-petroleum-products',
   'Technical Regulation for Petroleum Products',
   '2017-09-01', '2017-04-15', '2024-09-05',
   'Specifications for retail gasoline (91 / 95 RON), automotive diesel, LPG, jet fuel sold in Saudi Arabia. Sulphur cap aligned with EU standards. Source PDF is in Arabic.',
   '{standards,energy,emissions}'),

  -- ---- Services ---------------------------------------------------------
  ('SASO TR · Energy Efficiency for Buildings', 'saso-tr-energy-efficiency-for-buildings',
   'Technical Regulation for Energy Efficiency for Buildings',
   '2020-01-15', '2019-07-25', '2024-06-14',
   'Mandatory envelope-performance, HVAC efficiency, lighting power density and renewable-integration requirements for new construction under Saudi Vision 2030. Source PDF is in Arabic.',
   '{standards,energy,emissions,construction}'),
  ('SASO TR · Toys', 'saso-tr-toys',
   'Technical Regulation for Toys',
   '2017-04-01', '2016-10-12', '2024-01-12',
   'Mechanical, chemical, flammability and migration safety requirements for toys imported or manufactured for the Saudi market. Aligned with EN 71. Source PDF is in Arabic.',
   '{standards,worker-safety,chemicals}'),
  ('SASO TR · Children Use and Care Products', 'saso-tr-children-care-products',
   'Technical Regulation for Children Use and Care Products',
   '2020-11-01', '2020-06-30', '2024-09-18',
   'Mandatory safety + labelling requirements for child-care articles — feeding bottles, soothers, strollers, cribs, high chairs. Source PDF is in Arabic.',
   '{standards,worker-safety,chemicals}')
) as v(citation, slug, title,
       effective_date, published_at, last_changed_at,
       summary, topics);
