-- ============================================================================
-- RegWatch — Phase 1.0 corpus seed
--
-- Seeds the global regulator dimension and a curated sample of regulatory
-- items so the Browse + Detail surfaces have something to render before real
-- crawlers come online. Idempotent — safe to re-run.
--
-- After applying:
--   * /regwatch/browse renders a counted jurisdiction tile grid
--   * /regwatch/browse/[jurisdiction] renders a filterable row list
--   * /regwatch/r/[jurisdiction]/[slug] renders the detail reader
--
-- All seeded regulatory_items have NULL embedding (Voyage AI integration is a
-- later sub-phase). Body_search tsvector is populated automatically via the
-- generated column.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- jurisdiction_summary view — aggregates for the Browse tile grid
-- ---------------------------------------------------------------------------
create or replace view regwatch.jurisdiction_summary as
select
  r.jurisdiction_code,
  max(r.jurisdiction_name)                         as jurisdiction_name,
  max(r.region)                                    as region,
  count(distinct r.id)                             as regulator_count,
  count(distinct ri.id)                            as item_count,
  count(distinct ri.id) filter (
    where ri.last_changed_at > now() - interval '30 days'
  )                                                as recent_item_count
from regwatch.regulators r
left join regwatch.regulatory_items ri on ri.regulator_id = r.id
where r.is_active
group by r.jurisdiction_code;

grant select on regwatch.jurisdiction_summary to anon, authenticated, service_role;

-- ===========================================================================
-- Regulators seed (29 regulators across NA / EU / UK / MEA / INT)
-- ===========================================================================
insert into regwatch.regulators
  (slug, name, short_name, jurisdiction_code, jurisdiction_name, region, regulator_type, canonical_url, description, topic_domains)
values
  -- ---------- United States (10) ----------
  ('us-epa',       'United States Environmental Protection Agency',  'EPA',   'US', 'United States', 'na', 'federal-agency',     'https://www.epa.gov',
   'Federal agency for environmental protection, air and water quality, hazardous waste, and chemical regulation under TSCA, RCRA, CAA, CWA, EPCRA.',
   '{emissions,methane,reporting,permitting,pfas,process-safety,worker-safety}'::text[]),
  ('us-osha',      'Occupational Safety and Health Administration',   'OSHA',  'US', 'United States', 'na', 'federal-agency',     'https://www.osha.gov',
   'Workplace safety and health regulator covering process safety management (PSM), confined spaces, hazardous materials.',
   '{worker-safety,process-safety}'::text[]),
  ('us-bsee',      'Bureau of Safety and Environmental Enforcement',  'BSEE',  'US', 'United States', 'na', 'federal-agency',     'https://www.bsee.gov',
   'Offshore oil & gas operational safety, well control, and environmental enforcement on the US Outer Continental Shelf.',
   '{process-safety,permitting,emissions}'::text[]),
  ('us-blm',       'Bureau of Land Management',                        'BLM',   'US', 'United States', 'na', 'federal-agency',     'https://www.blm.gov',
   'Onshore federal mineral leasing, methane venting and flaring, surface management of public lands.',
   '{methane,emissions,permitting}'::text[]),
  ('us-ferc',      'Federal Energy Regulatory Commission',             'FERC',  'US', 'United States', 'na', 'commission',         'https://www.ferc.gov',
   'Regulates interstate transmission of natural gas, oil, and electricity; LNG terminals and pipeline siting.',
   '{permitting,reporting}'::text[]),
  ('us-doe',       'Department of Energy',                             'DOE',   'US', 'United States', 'na', 'federal-agency',     'https://www.energy.gov',
   'LNG export authorisations, energy efficiency standards, hydrogen and carbon management programs.',
   '{permitting,carbon-market}'::text[]),
  ('us-sec',       'US Securities and Exchange Commission',            'SEC',   'US', 'United States', 'na', 'commission',         'https://www.sec.gov',
   'Issuer climate disclosure rules, materiality, sustainability-linked instruments.',
   '{reporting,carbon-market}'::text[]),
  ('us-phmsa',     'Pipeline and Hazardous Materials Safety Admin.',   'PHMSA', 'US', 'United States', 'na', 'federal-agency',     'https://www.phmsa.dot.gov',
   'Pipeline safety, hazardous materials transportation, gas leak detection requirements.',
   '{process-safety,methane}'::text[]),
  ('us-uscg',      'United States Coast Guard',                        'USCG',  'US', 'United States', 'na', 'federal-agency',     'https://www.uscg.mil',
   'Marine bunker fuels, LNG marine terminals, IMO flag-state interface for US-flagged vessels.',
   '{bunker-spec,emissions}'::text[]),
  ('us-boem',      'Bureau of Ocean Energy Management',                'BOEM',  'US', 'United States', 'na', 'federal-agency',     'https://www.boem.gov',
   'Offshore lease management on the OCS, environmental review for oil & gas and offshore wind.',
   '{permitting,emissions}'::text[]),

  -- ---------- European Union (5) ----------
  ('eu-dg-ener',   'European Commission DG Energy',                    'DG ENER', 'EU', 'European Union', 'eu', 'commission',       'https://energy.ec.europa.eu',
   'EU energy policy: methane regulation, gas market design, security of supply, hydrogen.',
   '{methane,emissions,carbon-market}'::text[]),
  ('eu-dg-clima',  'European Commission DG Climate Action',            'DG CLIMA','EU', 'European Union', 'eu', 'commission',       'https://climate.ec.europa.eu',
   'EU ETS, CBAM, fluorinated gases, ESR, climate adaptation.',
   '{carbon-market,emissions,reporting}'::text[]),
  ('eu-echa',      'European Chemicals Agency',                        'ECHA',    'EU', 'European Union', 'eu', 'authority',        'https://echa.europa.eu',
   'REACH, CLP, Biocides, PIC, POPs — substance authorisation and restriction.',
   '{pfas,process-safety,worker-safety}'::text[]),
  ('eu-esma',      'European Securities and Markets Authority',        'ESMA',    'EU', 'European Union', 'eu', 'authority',        'https://www.esma.europa.eu',
   'CSRD / ESRS oversight, sustainability disclosure standards, EU green bond framework.',
   '{reporting,carbon-market}'::text[]),
  ('eu-emsa',      'European Maritime Safety Agency',                  'EMSA',    'EU', 'European Union', 'eu', 'authority',        'https://www.emsa.europa.eu',
   'MARPOL Annex VI compliance, ship inspections, FuelEU Maritime, EU ETS-maritime.',
   '{bunker-spec,emissions}'::text[]),

  -- ---------- United Kingdom (4) ----------
  ('uk-hse',       'Health and Safety Executive',                      'HSE',   'UK', 'United Kingdom', 'uk', 'authority',         'https://www.hse.gov.uk',
   'UK workplace safety, COMAH (major hazards), offshore safety case regulator.',
   '{process-safety,worker-safety}'::text[]),
  ('uk-nstauthority','North Sea Transition Authority',                 'NSTA',  'UK', 'United Kingdom', 'uk', 'authority',         'https://www.nstauthority.co.uk',
   'UK offshore oil & gas licensing, decommissioning, methane emissions oversight.',
   '{methane,permitting,emissions}'::text[]),
  ('uk-ea',        'Environment Agency (England)',                     'EA',    'UK', 'United Kingdom', 'uk', 'authority',         'https://www.gov.uk/government/organisations/environment-agency',
   'Environmental permitting, water quality, industrial emissions.',
   '{emissions,permitting,pfas}'::text[]),
  ('uk-desnz',     'Department for Energy Security and Net Zero',      'DESNZ', 'UK', 'United Kingdom', 'uk', 'federal-agency',    'https://www.gov.uk/government/organisations/department-for-energy-security-and-net-zero',
   'UK ETS, net-zero strategy, hydrogen and CCUS frameworks.',
   '{carbon-market,emissions,reporting}'::text[]),

  -- ---------- Middle East + Africa (5) ----------
  ('ae-adnoc-hse', 'ADNOC HSE Compliance Authority',                   'ADNOC HSE','AE', 'United Arab Emirates', 'mea', 'authority',  'https://www.adnoc.ae',
   'ADNOC Group HSE codes, methane and flaring requirements, contractor management standards.',
   '{methane,emissions,process-safety,worker-safety}'::text[]),
  ('sa-mwan',      'Ministry of Environment, Water and Agriculture (Saudi Arabia)', 'MEWA','SA', 'Saudi Arabia', 'mea', 'federal-agency','https://www.mewa.gov.sa',
   'Saudi environmental regulation, water permitting, industrial emissions.',
   '{emissions,permitting}'::text[]),
  ('qa-qpsa',      'Qatar Public Standards Authority',                 'QPSA',  'QA', 'Qatar',          'mea', 'standards-body',    'https://www.qpsa.gov.qa',
   'Qatari technical standards, LNG specifications, industrial safety.',
   '{bunker-spec,process-safety}'::text[]),
  ('kw-epa',       'Kuwait Environment Public Authority',              'KEPA',  'KW', 'Kuwait',         'mea', 'authority',         'https://www.epa.org.kw',
   'Kuwait environmental impact assessment, emissions permitting.',
   '{emissions,permitting}'::text[]),
  ('om-ecea',      'Oman Environment Authority',                       'OEA',   'OM', 'Oman',           'mea', 'authority',         'https://ea.gov.om',
   'Omani environmental permitting, hydrocarbons sector EHS oversight.',
   '{emissions,permitting,worker-safety}'::text[]),

  -- ---------- International bodies (5) ----------
  ('int-imo',      'International Maritime Organization',              'IMO',   'INT','International',  'int','international-body','https://www.imo.org',
   'MARPOL Annex VI, IBC Code, IGF Code, LNG marine fuels, ship recycling.',
   '{bunker-spec,emissions,worker-safety}'::text[]),
  ('int-ifc',      'International Finance Corporation',                'IFC',   'INT','International',  'int','international-body','https://www.ifc.org',
   'IFC Performance Standards, Equator Principles, EHS Guidelines.',
   '{emissions,worker-safety,process-safety}'::text[]),
  ('int-iea',      'International Energy Agency',                      'IEA',   'INT','International',  'int','international-body','https://www.iea.org',
   'Energy policy guidance, methane abatement frameworks, transition tracking.',
   '{methane,emissions,carbon-market}'::text[]),
  ('int-issb',     'International Sustainability Standards Board',     'ISSB',  'INT','International',  'int','standards-body',    'https://www.ifrs.org/groups/international-sustainability-standards-board/',
   'IFRS S1 and IFRS S2 sustainability and climate-related disclosure standards.',
   '{reporting,carbon-market}'::text[])
on conflict (slug) do update set
  name              = excluded.name,
  short_name        = excluded.short_name,
  jurisdiction_code = excluded.jurisdiction_code,
  jurisdiction_name = excluded.jurisdiction_name,
  region            = excluded.region,
  regulator_type    = excluded.regulator_type,
  canonical_url     = excluded.canonical_url,
  description       = excluded.description,
  topic_domains     = excluded.topic_domains,
  is_active         = true,
  updated_at        = now();

-- ===========================================================================
-- Sample regulatory_items (~25 items across the seed regulators)
-- ===========================================================================
-- Convenience: pull regulator UUIDs by slug for the inserts below.
insert into regwatch.regulatory_items
  (regulator_id, citation, slug, title, instrument_type, status,
   effective_date, proposed_date, consultation_closes_at, published_at, last_changed_at,
   source_url, summary, body_text, body_html,
   jurisdiction_code, topics, substances_cas, naics_codes, isic_codes, nace_codes,
   enrichment_status)
select r.id, v.citation, v.slug, v.title, v.instrument_type, v.status,
       v.effective_date, v.proposed_date, v.consultation_closes_at, v.published_at, v.last_changed_at,
       v.source_url, v.summary, v.body_text, v.body_html,
       v.jurisdiction_code, v.topics, v.substances_cas, v.naics_codes, v.isic_codes, v.nace_codes,
       'enriched'
from (values
  -- ---------- US EPA ----------
  ('us-epa', '40 CFR 261.4', '40-cfr-261-4',
   'Exclusions from definition of hazardous waste (RCRA Subpart A)',
   'secondary-legislation', 'in-force',
   date '1980-11-19', null, null::timestamptz, timestamptz '2024-03-15', timestamptz '2025-08-12',
   'https://www.ecfr.gov/current/title-40/chapter-I/subchapter-I/part-261/subpart-A/section-261.4',
   'Defines materials excluded from RCRA Subtitle C hazardous waste regulation, including domestic sewage, certain spent caustics, and recycled materials.',
   'This section excludes from the definition of solid waste those materials that are not waste because they are not abandoned, recycled, considered inherently waste-like, or used in a manner constituting disposal. Recent updates affect petroleum-coke handling and PFAS-bearing wastestreams.',
   '<p>This section excludes from the definition of solid waste those materials that are not waste because they are not abandoned, recycled, considered inherently waste-like, or used in a manner constituting disposal.</p><p>Recent updates affect petroleum-coke handling and PFAS-bearing wastestreams.</p>',
   'US', '{pfas,permitting}'::text[], '{1336-36-3,335-67-1}'::text[], '{2111,3241}'::text[], '{0610,1920}'::text[], '{0610,1920}'::text[]),

  ('us-epa', '89 FR 16280', '89-fr-16280',
   'Standards of Performance for New, Reconstructed, and Modified Sources in the Oil and Natural Gas Sector (Subpart OOOOb)',
   'final-rule', 'in-force',
   date '2024-05-07', date '2021-11-15', null::timestamptz, timestamptz '2024-03-08', timestamptz '2025-09-30',
   'https://www.federalregister.gov/documents/2024/03/08/2024-00366',
   'Final rule tightening methane and VOC standards on new, reconstructed, and modified oil & gas facilities, including super-emitter response programme.',
   'Establishes performance standards for fugitive emissions, well completions, storage tanks, pneumatic devices, and compressors. Implements LDAR at frequencies dependent on site type. Super-Emitter Programme allows third-party detection.',
   '<h3>Coverage</h3><p>New, reconstructed, and modified affected facilities in the oil and natural gas sector.</p><h3>Key requirements</h3><ul><li>LDAR at well sites every 90 days; compressor stations every 30 days.</li><li>Zero methane emission limit for new pneumatic controllers.</li><li>Super-Emitter Programme — third-party detection notifications must be investigated within 5 days.</li></ul>',
   'US', '{methane,emissions}'::text[], '{74-82-8}'::text[], '{2111,2212}'::text[], '{0610}'::text[], '{0610}'::text[]),

  ('us-epa', '40 CFR 60 OOOOc', '40-cfr-60-ooooc',
   'Emission Guidelines for Existing Sources in the Oil and Natural Gas Sector (Subpart OOOOc)',
   'guidance', 'in-force',
   date '2024-05-07', null, null::timestamptz, timestamptz '2024-03-08', timestamptz '2025-10-04',
   'https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-60/subpart-OOOOc',
   'Emission guidelines that states must follow when developing plans to limit methane emissions from existing oil & gas sources.',
   'States must submit plans within 24 months of publication. Compliance deadlines for affected designated facilities follow within 36 months of plan approval. The guidelines mirror Subpart OOOOb requirements with state implementation flexibility.',
   '<p>Provides emission guidelines that states must follow when developing plans under Clean Air Act section 111(d) to limit methane emissions from existing oil & gas sources.</p>',
   'US', '{methane,emissions}'::text[], '{74-82-8}'::text[], '{2111,2212}'::text[], '{0610}'::text[], '{0610}'::text[]),

  -- ---------- US OSHA ----------
  ('us-osha', '29 CFR 1910.119', '29-cfr-1910-119',
   'Process Safety Management of Highly Hazardous Chemicals',
   'secondary-legislation', 'in-force',
   date '1992-02-24', null, null::timestamptz, timestamptz '2017-05-15', timestamptz '2025-06-10',
   'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.119',
   'Process safety management requirements for facilities handling highly hazardous chemicals above threshold quantities, including PHA, MOC, and mechanical integrity.',
   'Requires Process Hazard Analyses every 5 years, Management of Change procedures, employee participation, contractor management, pre-startup safety reviews, mechanical integrity inspections, hot-work permits, and emergency planning.',
   '<p>Establishes procedures for managing hazards associated with processes using highly hazardous chemicals to help ensure safe and healthful workplaces.</p>',
   'US', '{process-safety,worker-safety}'::text[], '{74-90-8,75-21-8,7782-50-5}'::text[], '{3241,3251}'::text[], '{1920,2011}'::text[], '{1920,2011}'::text[]),

  -- ---------- US BSEE ----------
  ('us-bsee', '30 CFR 250 Subpart H', '30-cfr-250-h',
   'Oil and Gas Production Safety Systems on the OCS',
   'secondary-legislation', 'amended',
   date '2016-07-15', null, null::timestamptz, timestamptz '2024-09-22', timestamptz '2025-09-22',
   'https://www.ecfr.gov/current/title-30/chapter-II/subchapter-B/part-250/subpart-H',
   'Production safety system requirements for offshore facilities including SCSSV, surface safety valves, and emergency shut-down systems.',
   'Defines safety system design, testing, inspection, and reporting requirements for Outer Continental Shelf production installations.',
   '<p>Defines safety system design, testing, inspection, and reporting requirements for OCS production installations.</p>',
   'US', '{process-safety,permitting}'::text[], '{}'::text[], '{2111}'::text[], '{0610}'::text[], '{0610}'::text[]),

  -- ---------- US BLM ----------
  ('us-blm', '89 FR 25378', '89-fr-25378',
   'Waste Prevention, Production Subject to Royalties, and Resource Conservation',
   'final-rule', 'in-force',
   date '2024-06-10', date '2022-11-30', null::timestamptz, timestamptz '2024-04-10', timestamptz '2025-07-19',
   'https://www.federalregister.gov/documents/2024/04/10/2024-07375',
   'Updates rules on flaring, venting, and royalty-bearing methane losses from onshore federal and tribal oil & gas leases.',
   'Sets monthly venting limits, flaring caps, leak detection, and royalty obligations on lost methane. Replaces the 2018 rescission.',
   '<p>Updates rules on flaring, venting, and royalty-bearing methane losses from onshore federal and tribal oil & gas leases.</p>',
   'US', '{methane,emissions,permitting}'::text[], '{74-82-8}'::text[], '{2111}'::text[], '{0610}'::text[], '{0610}'::text[]),

  -- ---------- US SEC ----------
  ('us-sec', '17 CFR 229 (Regulation S-K, Subpart 1500)', '17-cfr-229-1500',
   'Enhancement and Standardization of Climate-Related Disclosures for Investors',
   'final-rule', 'amended',
   date '2024-05-28', date '2022-03-21', null::timestamptz, timestamptz '2024-03-06', timestamptz '2026-01-20',
   'https://www.sec.gov/rules/final/2024/33-11275.pdf',
   'Public-company climate disclosure rule covering governance, strategy, risk management, GHG metrics (Scope 1 and 2 for large filers), and financial statement impacts.',
   'Stayed in 2024 pending judicial review; partial vacatur and re-issuance in early 2026. Final rule applies to fiscal years beginning on or after the specified phase-in by filer status.',
   '<p>Requires SEC registrants to disclose material climate-related risks, GHG emissions (Scope 1 and 2 for large accelerated filers), and certain weather-related financial statement impacts.</p>',
   'US', '{reporting,carbon-market}'::text[], '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[]),

  ('us-sec', '17 CFR 229 (Reg S-K Item 1502 update)', '17-cfr-229-1502-2026',
   'Proposed amendments — Climate disclosure Scope 3 reinstatement',
   'proposed-rule', 'consultation-open',
   null::date, date '2026-03-15', timestamptz '2026-07-30', timestamptz '2026-03-15', timestamptz '2026-03-15',
   'https://www.federalregister.gov/documents/2026/03/15/2026-05000',
   'Reproposes Scope 3 disclosure for large accelerated filers with phased materiality threshold.',
   'Consultation closes 30 July 2026; comment period extended once.',
   '<p>The Commission is proposing amendments to reinstate Scope 3 disclosure for issuers with material value-chain emissions, with a phased materiality threshold based on revenue and sector NAICS classification.</p>',
   'US', '{reporting,carbon-market}'::text[], '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[]),

  -- ---------- EU DG ENER ----------
  ('eu-dg-ener', 'Regulation (EU) 2024/1787', 'eu-2024-1787',
   'Regulation on methane emissions reduction in the energy sector',
   'primary-legislation', 'in-force',
   date '2024-08-04', null, null::timestamptz, timestamptz '2024-07-15', timestamptz '2025-11-12',
   'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1787',
   'EU methane regulation covering domestic oil, gas, and coal operations plus methane intensity requirements on imports from 2030.',
   'Establishes monitoring, reporting and verification at source, requirements on leak detection and repair, venting and flaring restrictions, and an import requirement that takes effect for fossil energy imports from 2030.',
   '<h3>Coverage</h3><p>Applies to oil, fossil gas and coal operators in the EU plus EU importers of these commodities.</p><h3>Key requirements</h3><ul><li>Source-level MRV by 2025 (Tier 3 by 2027 for upstream gas).</li><li>LDAR programmes with defined frequencies.</li><li>Venting and routine flaring prohibited except in defined cases.</li><li>From 2030, importers must demonstrate equivalent MRV at the production country.</li></ul>',
   'EU', '{methane,emissions,reporting}'::text[], '{74-82-8}'::text[], '{2111,0510}'::text[], '{0610,0510}'::text[], '{0610,0510}'::text[]),

  -- ---------- EU DG CLIMA ----------
  ('eu-dg-clima', 'Regulation (EU) 2023/956', 'eu-2023-956',
   'Carbon Border Adjustment Mechanism (CBAM)',
   'primary-legislation', 'in-force',
   date '2023-10-01', null, null::timestamptz, timestamptz '2023-05-17', timestamptz '2025-12-08',
   'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956',
   'Establishes the Carbon Border Adjustment Mechanism on imports of cement, iron and steel, aluminium, fertilisers, electricity, and hydrogen.',
   'Transitional period 2023-10-01 to 2025-12-31 (reporting only). Definitive period from 2026 with surrender of CBAM certificates priced to weekly EU ETS auction.',
   '<p>Establishes the Carbon Border Adjustment Mechanism (CBAM) on imports of selected products with high carbon intensity.</p>',
   'EU', '{carbon-market,emissions,reporting}'::text[], '{}'::text[], '{3311,3312}'::text[], '{2410,2420}'::text[], '{2410,2420}'::text[]),

  ('eu-dg-clima', 'Directive (EU) 2023/959', 'eu-2023-959',
   'Revised EU Emissions Trading System (Phase 4 update)',
   'primary-legislation', 'in-force',
   date '2024-06-05', null, null::timestamptz, timestamptz '2023-05-16', timestamptz '2025-06-30',
   'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L0959',
   'Strengthens the EU ETS, extends to maritime shipping from 2024, introduces ETS2 for buildings and road transport from 2027.',
   'Raises the linear reduction factor, accelerates free allocation phase-out, and integrates maritime emissions starting January 2024.',
   '<p>Strengthens the EU ETS and extends its scope to maritime transport (2024) and a separate ETS2 for buildings and road transport (2027).</p>',
   'EU', '{carbon-market,emissions}'::text[], '{}'::text[], '{4911,4922}'::text[], '{5012,5022}'::text[], '{5012,5022}'::text[]),

  -- ---------- EU ECHA ----------
  ('eu-echa', 'REACH Annex XVII Entry 68 (PFAS restriction)', 'reach-annex-xvii-68',
   'Proposed universal restriction on PFAS under REACH',
   'proposed-rule', 'consultation-closed',
   null::date, date '2023-02-07', timestamptz '2023-09-25', timestamptz '2023-02-07', timestamptz '2025-11-20',
   'https://echa.europa.eu/registry-of-restriction-intentions/-/dislist/details/0b0236e18663449b',
   'Universal PFAS restriction proposal from Germany, Netherlands, Denmark, Norway and Sweden. SEAC opinion pending.',
   'Covers approximately 10,000 PFAS substances. Sector-specific derogations under evaluation through 2026.',
   '<p>A universal restriction on perfluoroalkyl and polyfluoroalkyl substances (PFAS) submitted by five Member State Competent Authorities.</p>',
   'EU', '{pfas,process-safety}'::text[], '{1763-23-1,375-73-5,335-67-1}'::text[], '{3251,3252,3344}'::text[], '{2011,2030}'::text[], '{2011,2030}'::text[]),

  -- ---------- EU ESMA ----------
  ('eu-esma', 'ESRS E1 (Climate change)', 'esrs-e1',
   'European Sustainability Reporting Standard E1 — Climate change',
   'standard', 'in-force',
   date '2024-01-01', null, null::timestamptz, timestamptz '2023-07-31', timestamptz '2025-09-15',
   'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2772',
   'Mandatory CSRD disclosure standard on transition plans, GHG emissions Scope 1/2/3, internal carbon pricing, and physical/transition risks.',
   'Applied first by large undertakings for FY2024 reporting; phase-in for listed SMEs, non-EU groups from 2028.',
   '<p>Establishes mandatory disclosure requirements on climate change mitigation, adaptation, and energy under the CSRD.</p>',
   'EU', '{reporting,carbon-market,emissions}'::text[], '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[]),

  -- ---------- EU EMSA ----------
  ('eu-emsa', 'Regulation (EU) 2023/1805', 'eu-2023-1805',
   'FuelEU Maritime — GHG intensity limits for ship-fuels',
   'primary-legislation', 'in-force',
   date '2025-01-01', null, null::timestamptz, timestamptz '2023-09-22', timestamptz '2025-10-28',
   'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1805',
   'Limits well-to-wake GHG intensity of energy used by ships above 5,000 GT trading in EU waters, with stepped reductions to 2050.',
   'GHG intensity reduction targets of 2% (2025), 6% (2030), 14% (2035), 31% (2040), 62% (2045), 80% (2050) versus 2020 baseline.',
   '<p>Limits the well-to-wake GHG intensity of energy used onboard ships above 5,000 GT operating to/from EU ports.</p>',
   'EU', '{bunker-spec,emissions}'::text[], '{}'::text[], '{4831,4832}'::text[], '{5011,5012}'::text[], '{5011,5012}'::text[]),

  -- ---------- UK HSE ----------
  ('uk-hse', 'SI 2015/483', 'si-2015-483',
   'Control of Major Accident Hazards Regulations 2015 (COMAH)',
   'secondary-legislation', 'in-force',
   date '2015-06-01', null, null::timestamptz, timestamptz '2015-03-12', timestamptz '2025-04-10',
   'https://www.legislation.gov.uk/uksi/2015/483/contents/made',
   'Implements EU Seveso III in Great Britain — major accident prevention for upper-tier and lower-tier establishments handling dangerous substances.',
   'Operators must produce a Major Accident Prevention Policy, Safety Report (upper tier), and emergency plans; CA inspections every 1-3 years.',
   '<p>Implements the Seveso III Directive in Great Britain, controlling major-accident hazards involving dangerous substances.</p>',
   'UK', '{process-safety,worker-safety,permitting}'::text[], '{50-00-0,7782-50-5,1310-58-3}'::text[], '{3241,3251}'::text[], '{1920,2011}'::text[], '{1920,2011}'::text[]),

  -- ---------- UK NSTA ----------
  ('uk-nstauthority', 'NSTA Methane Action Plan v2.0', 'nsta-methane-plan-v2',
   'North Sea Methane Action Plan — Operator Targets v2.0',
   'guidance', 'in-force',
   date '2026-01-01', null, null::timestamptz, timestamptz '2025-11-04', timestamptz '2025-11-04',
   'https://www.nstauthority.co.uk/regulatory-information/methane',
   'Sets methane intensity targets for UK Continental Shelf operators with quarterly reporting from 2026.',
   'Targets 0.20% intensity by 2027 and 0.10% by 2030. Quarterly OGV-2 reporting via the WONS portal.',
   '<p>Sets methane intensity targets for UK Continental Shelf operators with mandatory quarterly reporting.</p>',
   'UK', '{methane,emissions,reporting}'::text[], '{74-82-8}'::text[], '{2111}'::text[], '{0610}'::text[], '{0610}'::text[]),

  -- ---------- UK EA ----------
  ('uk-ea', 'EA Position Statement RPS 268', 'rps-268',
   'Regulatory Position Statement 268 — PFAS in environmental permits',
   'guidance', 'in-force',
   date '2025-09-01', null, null::timestamptz, timestamptz '2025-07-22', timestamptz '2025-09-01',
   'https://www.gov.uk/government/publications/pfas-environmental-permits-rps-268',
   'EA position on PFAS-bearing discharges and reporting expectations pending UK REACH restriction.',
   'Applies to environmental permits granted under the Environmental Permitting (England and Wales) Regulations 2016 for sites with known PFAS sources.',
   '<p>Sets out the Environment Agency''s position on PFAS-bearing discharges and reporting expectations pending UK REACH restriction.</p>',
   'UK', '{pfas,emissions,permitting}'::text[], '{1763-23-1,335-67-1}'::text[], '{3251,3344}'::text[], '{2011}'::text[], '{2011}'::text[]),

  -- ---------- UK DESNZ ----------
  ('uk-desnz', 'UK ETS Authority Determination 2026/1', 'uk-ets-2026-1',
   'UK ETS — Free allocation methodology update 2026',
   'final-rule', 'in-force',
   date '2026-04-01', date '2025-10-01', null::timestamptz, timestamptz '2026-02-12', timestamptz '2026-02-12',
   'https://www.gov.uk/government/consultations/uk-ets-developing-the-uk-emissions-trading-scheme',
   'Updates the free allocation benchmark methodology and tightens the cap trajectory through 2030.',
   'New cap aligns with the carbon budget six pathway. Benchmark factors recalibrated for refining, steel, and chemicals.',
   '<p>Updates the free allocation benchmark methodology and tightens the cap trajectory through 2030 under the UK Emissions Trading Scheme.</p>',
   'UK', '{carbon-market,emissions}'::text[], '{}'::text[], '{3241,3311,3251}'::text[], '{1920,2410,2011}'::text[], '{1920,2410,2011}'::text[]),

  -- ---------- AE ADNOC ----------
  ('ae-adnoc-hse', 'ADNOC HSE Code of Practice CoPV3-04', 'adnoc-copv3-04',
   'ADNOC Methane Reduction Code of Practice (Rev 4)',
   'standard', 'in-force',
   date '2025-04-01', null, null::timestamptz, timestamptz '2025-02-10', timestamptz '2025-08-20',
   'https://www.adnoc.ae/en/sustainability',
   'ADNOC Group-wide code on methane reduction across upstream, midstream and downstream operations.',
   'Establishes the 0.15% methane intensity target by 2025 with annual third-party verification. Applies to operated and non-operated assets above 25% ADNOC equity.',
   '<p>ADNOC Group-wide Code of Practice covering methane reduction targets, LDAR programmes, venting and flaring restrictions across operated and non-operated assets.</p>',
   'AE', '{methane,emissions,reporting}'::text[], '{74-82-8}'::text[], '{2111}'::text[], '{0610}'::text[], '{0610}'::text[]),

  -- ---------- SA MEWA ----------
  ('sa-mwan', 'MEWA Industrial Emissions Cabinet Decree 2025/M-44', 'mewa-2025-m-44',
   'Industrial Emissions National Cap and Trading Framework',
   'primary-legislation', 'in-force',
   date '2025-07-01', null, null::timestamptz, timestamptz '2025-04-12', timestamptz '2025-07-01',
   'https://www.mewa.gov.sa/en/Ministry/News/Pages/news-12042025.aspx',
   'Establishes Saudi Arabia''s national industrial emissions cap-and-trade framework as part of Vision 2030 environmental pillar.',
   'Sectors covered: refining, petrochemicals, cement, aluminium. Allowance allocation by historical benchmarking, surrender from FY2026.',
   '<p>Establishes a national industrial emissions cap-and-trade framework as part of Vision 2030.</p>',
   'SA', '{carbon-market,emissions,reporting}'::text[], '{}'::text[], '{3241,3251,3311,3273}'::text[], '{1920,2011,2410,2394}'::text[], '{1920,2011,2410,2394}'::text[]),

  -- ---------- QA QPSA ----------
  ('qa-qpsa', 'QPSA Spec QS 32-2025', 'qs-32-2025',
   'Qatari LNG Marine Fuel Specification (post-IMO 2025 sulphur compliance)',
   'standard', 'in-force',
   date '2025-01-01', null, null::timestamptz, timestamptz '2024-10-08', timestamptz '2025-01-01',
   'https://www.qpsa.gov.qa/en/specifications/qs-32',
   'Qatari LNG marine fuel specification updated for IMO MARPOL Annex VI 2025 sulphur compliance reading.',
   'Specifies maximum methane number, calorific value bands, and Wobbe index for LNG bunker product loaded at Ras Laffan terminals.',
   '<p>Specifies the Qatari LNG marine fuel quality requirements for export to IMO-compliant vessels.</p>',
   'QA', '{bunker-spec,emissions}'::text[], '{}'::text[], '{2111,4862}'::text[], '{0610,4930}'::text[], '{0610,4930}'::text[]),

  -- ---------- INT IMO ----------
  ('int-imo', 'MEPC.328(76)', 'mepc-328-76',
   'MARPOL Annex VI 2021 Amendments — EEXI / CII',
   'standard', 'in-force',
   date '2023-01-01', null, null::timestamptz, timestamptz '2021-06-17', timestamptz '2025-03-14',
   'https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MEPCDocuments/MEPC.328(76).pdf',
   'Energy Efficiency Existing Ship Index (EEXI) and Carbon Intensity Indicator (CII) regulations.',
   'Mandatory technical (EEXI) and operational (CII) carbon intensity measures for ships over 5,000 GT. CII rating A through E published annually.',
   '<p>Establishes the Energy Efficiency Existing Ship Index (EEXI) and the operational Carbon Intensity Indicator (CII) under MARPOL Annex VI.</p>',
   'INT', '{bunker-spec,emissions}'::text[], '{}'::text[], '{4831,4832}'::text[], '{5011,5012}'::text[], '{5011,5012}'::text[]),

  -- ---------- INT ISSB ----------
  ('int-issb', 'IFRS S2', 'ifrs-s2',
   'Climate-related Disclosures',
   'standard', 'in-force',
   date '2024-01-01', null, null::timestamptz, timestamptz '2023-06-26', timestamptz '2025-08-19',
   'https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/ifrs-s2-climate-related-disclosures.html',
   'ISSB sustainability disclosure standard covering governance, strategy, risk management, and climate-related metrics including Scope 1, 2, and 3 GHG emissions.',
   'Adopted by 25+ jurisdictions as the basis for mandatory climate disclosure. Effective for annual reporting periods beginning on or after 1 January 2024.',
   '<p>The IFRS Sustainability Disclosure Standard requiring entities to disclose climate-related risks and opportunities.</p>',
   'INT', '{reporting,emissions,carbon-market}'::text[], '{}'::text[], '{}'::text[], '{}'::text[], '{}'::text[]),

  -- ---------- INT IEA ----------
  ('int-iea', 'IEA Methane Tracker Framework v4', 'iea-methane-tracker-v4',
   'IEA Methane Tracker — Reporting Framework v4',
   'guidance', 'in-force',
   date '2025-02-01', null, null::timestamptz, timestamptz '2025-01-15', timestamptz '2025-02-01',
   'https://www.iea.org/data-and-statistics/data-tools/methane-tracker',
   'Methodological framework for member-state and operator methane emissions reporting feeding the IEA Methane Tracker.',
   'Aligns with OGMP 2.0 Levels 4 and 5. Reporting cycle annual; data published with two-quarter lag.',
   '<p>Provides the methodological framework for member-state and operator methane emissions reporting feeding the IEA Methane Tracker.</p>',
   'INT', '{methane,emissions,reporting}'::text[], '{74-82-8}'::text[], '{2111,2212}'::text[], '{0610,3520}'::text[], '{0610,3520}'::text[])
) as v(
  regulator_slug, citation, slug, title, instrument_type, status,
  effective_date, proposed_date, consultation_closes_at, published_at, last_changed_at,
  source_url, summary, body_text, body_html,
  jurisdiction_code, topics, substances_cas, naics_codes, isic_codes, nace_codes
)
join regwatch.regulators r on r.slug = v.regulator_slug
on conflict (regulator_id, citation) do update set
  title              = excluded.title,
  status             = excluded.status,
  effective_date     = excluded.effective_date,
  proposed_date      = excluded.proposed_date,
  consultation_closes_at = excluded.consultation_closes_at,
  published_at       = excluded.published_at,
  last_changed_at    = excluded.last_changed_at,
  source_url         = excluded.source_url,
  summary            = excluded.summary,
  body_text          = excluded.body_text,
  body_html          = excluded.body_html,
  topics             = excluded.topics,
  substances_cas     = excluded.substances_cas,
  naics_codes        = excluded.naics_codes,
  isic_codes         = excluded.isic_codes,
  nace_codes         = excluded.nace_codes,
  enrichment_status  = 'enriched',
  updated_at         = now();

-- ===========================================================================
-- End of 20260605_regwatch_regulator_seed.sql
-- ===========================================================================
