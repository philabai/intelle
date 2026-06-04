/**
 * NAICS subset curated for RegWatch's energy + industrial focus.
 *
 * Source: US Census Bureau NAICS 2022. This is intentionally a narrow slice —
 * upstream / midstream / downstream / chemicals / power / heavy industry. Phase
 * 1.x expands the picker to full NAICS search via autocomplete; for the v1
 * configurator a curated list keeps the UX scannable.
 */

export interface NaicsOption {
  code: string;
  label: string;
  sector: "upstream" | "midstream" | "downstream" | "power" | "chemicals" | "manufacturing" | "transport" | "support";
}

export const NAICS: NaicsOption[] = [
  // Upstream oil & gas
  { code: "2111", label: "Oil and gas extraction", sector: "upstream" },
  { code: "211120", label: "Crude petroleum extraction", sector: "upstream" },
  { code: "211130", label: "Natural gas extraction", sector: "upstream" },

  // Midstream
  { code: "2212", label: "Natural gas distribution", sector: "midstream" },
  { code: "4862", label: "Pipeline transportation of natural gas", sector: "midstream" },
  { code: "4861", label: "Pipeline transportation of crude oil", sector: "midstream" },
  { code: "486910", label: "Pipeline transportation of refined products", sector: "midstream" },
  { code: "493190", label: "Other warehousing and storage (incl. tank farms)", sector: "midstream" },

  // Downstream / refining
  { code: "3241", label: "Petroleum and coal product manufacturing", sector: "downstream" },
  { code: "324110", label: "Petroleum refineries", sector: "downstream" },
  { code: "324191", label: "Petroleum lubricating oil and grease mfg", sector: "downstream" },
  { code: "424710", label: "Petroleum bulk stations and terminals", sector: "downstream" },

  // Chemicals
  { code: "3251", label: "Basic chemical manufacturing", sector: "chemicals" },
  { code: "325110", label: "Petrochemical manufacturing", sector: "chemicals" },
  { code: "325120", label: "Industrial gas manufacturing", sector: "chemicals" },
  { code: "325180", label: "Other basic inorganic chemical mfg", sector: "chemicals" },
  { code: "3252", label: "Resin, synthetic rubber, fibers, filaments mfg", sector: "chemicals" },
  { code: "325211", label: "Plastics material and resin mfg", sector: "chemicals" },
  { code: "3253", label: "Pesticide, fertilizer, and ag chemicals", sector: "chemicals" },
  { code: "325199", label: "Other basic organic chemical mfg", sector: "chemicals" },

  // Power
  { code: "2211", label: "Electric power generation, transmission, distribution", sector: "power" },
  { code: "221112", label: "Fossil fuel electric power generation", sector: "power" },
  { code: "221113", label: "Nuclear electric power generation", sector: "power" },
  { code: "221114", label: "Solar electric power generation", sector: "power" },
  { code: "221115", label: "Wind electric power generation", sector: "power" },

  // Heavy manufacturing (CBAM scope)
  { code: "3273", label: "Cement and concrete product mfg", sector: "manufacturing" },
  { code: "327310", label: "Cement manufacturing", sector: "manufacturing" },
  { code: "3311", label: "Iron and steel mills", sector: "manufacturing" },
  { code: "3313", label: "Alumina and aluminum production", sector: "manufacturing" },
  { code: "3312", label: "Steel product mfg from purchased steel", sector: "manufacturing" },

  // Transport (maritime / bunker)
  { code: "4831", label: "Deep sea, coastal, and Great Lakes transportation", sector: "transport" },
  { code: "4832", label: "Inland water transportation", sector: "transport" },
  { code: "483111", label: "Deep sea freight transportation", sector: "transport" },
  { code: "483113", label: "Coastal and Great Lakes freight transportation", sector: "transport" },

  // Support
  { code: "213111", label: "Drilling oil and gas wells", sector: "support" },
  { code: "213112", label: "Support activities for oil and gas operations", sector: "support" },
  { code: "541330", label: "Engineering services", sector: "support" },
  { code: "541620", label: "Environmental consulting services", sector: "support" },
];

export const NAICS_BY_SECTOR: Record<NaicsOption["sector"], NaicsOption[]> = NAICS.reduce(
  (acc, n) => {
    (acc[n.sector] ??= []).push(n);
    return acc;
  },
  {} as Record<NaicsOption["sector"], NaicsOption[]>,
);

export const SECTOR_LABEL: Record<NaicsOption["sector"], string> = {
  upstream: "Upstream oil & gas",
  midstream: "Midstream (pipelines, storage, LNG)",
  downstream: "Downstream / refining",
  power: "Power generation",
  chemicals: "Chemicals & petrochemicals",
  manufacturing: "Heavy manufacturing (CBAM scope)",
  transport: "Marine / bunker transport",
  support: "Support & services",
};

export function naicsLabel(code: string): string {
  return NAICS.find((n) => n.code === code)?.label ?? code;
}
