/**
 * Asset hierarchy starter packs.
 *
 * Each pack seeds L3 (Area / Process Unit) and L4 (Asset Class) nodes under
 * a user-selected L2 (Site). Drawn from industry-standard taxonomies so a
 * customer's existing EAM data lines up:
 *
 *   - iso-14224: Oil & gas + petrochemicals. ISO 14224:2016 equipment classes.
 *   - rds-pp:    Power generation (incl. renewables). RDS-PP / IEC 81346.
 *   - gmdn:      Medical devices. Global Medical Device Nomenclature
 *                (top-level only; drill is too granular for the starter).
 *   - ata-100:   Aerospace. ATA 100 / iSpec 2200 chapter-level.
 *   - isa-95:    Generic manufacturing. ISA-95 site → area → work unit.
 *
 * Admins fill L2 (Sites) themselves, then pick which Sites get a starter
 * pack seeded under them. They fill L5 (specific tags) manually or via
 * CSV import.
 */

export type StarterPackId =
  | "iso-14224"
  | "rds-pp"
  | "gmdn"
  | "ata-100"
  | "isa-95";

export interface StarterPackNode {
  code: string;
  name: string;
  /** L4 children that hang under this L3 area. */
  asset_classes: { code: string; name: string }[];
}

export interface StarterPack {
  id: StarterPackId;
  label: string;
  description: string;
  industries: string[];
  /** L3 areas, each with their L4 asset classes. */
  areas: StarterPackNode[];
}

const ISO_14224: StarterPack = {
  id: "iso-14224",
  label: "ISO 14224 — Oil & gas + petrochemicals",
  description:
    "Reliability data taxonomy from ISO 14224:2016. Process areas + equipment classes used across upstream, midstream, and downstream.",
  industries: ["Oil & gas", "Petrochemicals", "LNG"],
  areas: [
    {
      code: "PROD",
      name: "Production / Process",
      asset_classes: [
        { code: "PMP-CENT", name: "Centrifugal pump" },
        { code: "PMP-RECP", name: "Reciprocating pump" },
        { code: "COMP-CENT", name: "Centrifugal compressor" },
        { code: "COMP-RECP", name: "Reciprocating compressor" },
        { code: "TRB-GAS", name: "Gas turbine" },
        { code: "TRB-STM", name: "Steam turbine" },
        { code: "HX-SHELL", name: "Shell-and-tube heat exchanger" },
        { code: "HX-PLATE", name: "Plate heat exchanger" },
        { code: "VSL-SEP", name: "Separator vessel" },
        { code: "VSL-COL", name: "Distillation column" },
        { code: "FRN", name: "Fired heater / furnace" },
        { code: "FLR", name: "Flare stack" },
      ],
    },
    {
      code: "UTIL",
      name: "Utilities",
      asset_classes: [
        { code: "BLR", name: "Boiler" },
        { code: "GEN-DSL", name: "Diesel generator" },
        { code: "ARU", name: "Air receiver / compressed air" },
        { code: "WTR-TRT", name: "Water treatment unit" },
      ],
    },
    {
      code: "STOR",
      name: "Storage",
      asset_classes: [
        { code: "TNK-ATM", name: "Atmospheric storage tank" },
        { code: "TNK-PRS", name: "Pressurised storage vessel" },
        { code: "BLT-SPH", name: "Bullet / spherical LPG tank" },
      ],
    },
    {
      code: "MARN",
      name: "Marine / Loading",
      asset_classes: [
        { code: "MAN-LD", name: "Loading manifold" },
        { code: "JET", name: "Jetty" },
        { code: "SBM", name: "Single-buoy mooring" },
      ],
    },
    {
      code: "SAFE",
      name: "Safety systems",
      asset_classes: [
        { code: "PSV", name: "Pressure safety valve" },
        { code: "ESD", name: "Emergency shutdown system" },
        { code: "GAS-DET", name: "Gas detection system" },
        { code: "FIR-DET", name: "Fire detection system" },
        { code: "FIR-WTR", name: "Firewater system" },
      ],
    },
  ],
};

const RDS_PP: StarterPack = {
  id: "rds-pp",
  label: "RDS-PP — Power generation",
  description:
    "Reference designation system for power plants. Covers conventional + renewables, aligned with IEC 81346.",
  industries: ["Power generation", "Utilities", "Wind", "Solar", "Nuclear"],
  areas: [
    {
      code: "MAA",
      name: "Steam cycle",
      asset_classes: [
        { code: "MAA-BLR", name: "Boiler" },
        { code: "MAA-TRB", name: "Steam turbine" },
        { code: "MAA-COND", name: "Condenser" },
        { code: "MAA-FWH", name: "Feedwater heater" },
      ],
    },
    {
      code: "MBL",
      name: "Combustion turbine",
      asset_classes: [
        { code: "MBL-GT", name: "Gas turbine" },
        { code: "MBL-HRSG", name: "Heat recovery steam generator" },
      ],
    },
    {
      code: "MKA",
      name: "Wind",
      asset_classes: [
        { code: "MKA-WTG", name: "Wind turbine generator" },
        { code: "MKA-TWR", name: "Tower" },
        { code: "MKA-NAC", name: "Nacelle" },
      ],
    },
    {
      code: "MJK",
      name: "Solar",
      asset_classes: [
        { code: "MJK-PV", name: "PV panel array" },
        { code: "MJK-INV", name: "Inverter" },
        { code: "MJK-TRK", name: "Tracker" },
      ],
    },
    {
      code: "BFA",
      name: "Substation / HV",
      asset_classes: [
        { code: "BFA-TRF", name: "Power transformer" },
        { code: "BFA-CB", name: "Circuit breaker" },
        { code: "BFA-DIS", name: "Disconnector / isolator" },
        { code: "BFA-PT", name: "Potential transformer" },
      ],
    },
  ],
};

const GMDN: StarterPack = {
  id: "gmdn",
  label: "GMDN — Medical devices",
  description:
    "Global Medical Device Nomenclature category groupings, used by FDA + EU MDR submissions.",
  industries: ["Medical devices", "Hospitals", "Diagnostics"],
  areas: [
    {
      code: "IMG",
      name: "Imaging",
      asset_classes: [
        { code: "MRI", name: "MRI scanner" },
        { code: "CT", name: "CT scanner" },
        { code: "XR", name: "X-ray system" },
        { code: "US", name: "Ultrasound" },
      ],
    },
    {
      code: "LIFE",
      name: "Life support",
      asset_classes: [
        { code: "VENT", name: "Ventilator" },
        { code: "DEF", name: "Defibrillator" },
        { code: "ECMO", name: "ECMO system" },
      ],
    },
    {
      code: "SURG",
      name: "Surgical",
      asset_classes: [
        { code: "ANES", name: "Anaesthesia workstation" },
        { code: "ROB", name: "Surgical robot" },
        { code: "ESU", name: "Electrosurgical unit" },
      ],
    },
    {
      code: "LAB",
      name: "Laboratory",
      asset_classes: [
        { code: "ANL-CHEM", name: "Clinical chemistry analyser" },
        { code: "ANL-HEM", name: "Hematology analyser" },
        { code: "PCR", name: "PCR thermocycler" },
      ],
    },
    {
      code: "MON",
      name: "Patient monitoring",
      asset_classes: [
        { code: "MON-VS", name: "Vital signs monitor" },
        { code: "ECG", name: "ECG system" },
        { code: "INF", name: "Infusion pump" },
      ],
    },
  ],
};

const ATA_100: StarterPack = {
  id: "ata-100",
  label: "ATA 100 — Aerospace",
  description:
    "Air Transport Association chapter-level grouping (iSpec 2200), industry-standard for aircraft maintenance manuals.",
  industries: ["Aerospace", "Defence", "MRO"],
  areas: [
    {
      code: "ATA-21",
      name: "Air conditioning",
      asset_classes: [
        { code: "PACK", name: "ECS pack" },
        { code: "RAM", name: "RAM-air system" },
      ],
    },
    {
      code: "ATA-27",
      name: "Flight controls",
      asset_classes: [
        { code: "AIL", name: "Aileron actuator" },
        { code: "ELV", name: "Elevator actuator" },
        { code: "RDR", name: "Rudder actuator" },
      ],
    },
    {
      code: "ATA-32",
      name: "Landing gear",
      asset_classes: [
        { code: "MLG", name: "Main landing gear" },
        { code: "NLG", name: "Nose landing gear" },
        { code: "BRK", name: "Brake assembly" },
      ],
    },
    {
      code: "ATA-71",
      name: "Powerplant",
      asset_classes: [
        { code: "ENG", name: "Engine" },
        { code: "APU", name: "Auxiliary power unit" },
      ],
    },
    {
      code: "ATA-77",
      name: "Engine indicating",
      asset_classes: [
        { code: "EICAS", name: "Engine indicating + crew alerting" },
        { code: "FADEC", name: "FADEC" },
      ],
    },
  ],
};

const ISA_95: StarterPack = {
  id: "isa-95",
  label: "ISA-95 — Generic manufacturing",
  description:
    "Site → Area → Work Centre hierarchy from ISA-95 / IEC 62264. Use when no industry-specific pack applies.",
  industries: ["Manufacturing", "Food & beverage", "Pharmaceuticals"],
  areas: [
    {
      code: "PROC",
      name: "Process area",
      asset_classes: [
        { code: "REACT", name: "Reactor" },
        { code: "MIXER", name: "Mixer" },
        { code: "DRY", name: "Dryer" },
        { code: "MILL", name: "Mill" },
      ],
    },
    {
      code: "PACK",
      name: "Packaging",
      asset_classes: [
        { code: "FILL", name: "Filling line" },
        { code: "CAP", name: "Capping machine" },
        { code: "LBL", name: "Labelling machine" },
        { code: "PAL", name: "Palletiser" },
      ],
    },
    {
      code: "UTIL",
      name: "Utilities",
      asset_classes: [
        { code: "CHL", name: "Chiller" },
        { code: "COMP", name: "Air compressor" },
        { code: "WTR-PURE", name: "Purified water system" },
      ],
    },
    {
      code: "QC",
      name: "Quality control",
      asset_classes: [
        { code: "HPLC", name: "HPLC system" },
        { code: "GC", name: "Gas chromatograph" },
        { code: "BAL", name: "Analytical balance" },
      ],
    },
  ],
};

export const STARTER_PACKS: Record<StarterPackId, StarterPack> = {
  "iso-14224": ISO_14224,
  "rds-pp": RDS_PP,
  gmdn: GMDN,
  "ata-100": ATA_100,
  "isa-95": ISA_95,
};

export const STARTER_PACK_LIST: StarterPack[] = Object.values(STARTER_PACKS);

export function getStarterPack(id: StarterPackId): StarterPack {
  return STARTER_PACKS[id];
}
