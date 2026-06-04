import type { Connector } from "./types";
import { FEDERAL_REGISTER_CONNECTORS } from "./federal-register";
import { EUR_LEX_CONNECTORS } from "./eur-lex";
import { GOVUK_CONNECTORS } from "./govuk-scraper";
import { IMO_CONNECTORS } from "./imo-scraper";

/**
 * Registry of every connector RegWatch knows about. The crawl orchestrator
 * iterates this list and persists the merged item set via the service-role
 * Supabase client.
 *
 * Phase 1.x adds:
 *  - ECHA — REACH restriction intentions (XML feed)
 *  - ECHA — SVHC list (HTML scrape)
 *  - ESMA — CSRD / ESRS implementing acts (Atom)
 *  - eCFR — point-in-time corpus deltas (REST API)
 *  - NSTA, BSEE, IFRS / ISSB, IEA, IRENA — mostly HTML scrapes
 *  - ADNOC, MEWA, QPSA — HTML scrapes (no API, dynamic JS may require headless)
 */
export const REGWATCH_CONNECTORS: Connector[] = [
  ...FEDERAL_REGISTER_CONNECTORS,
  ...EUR_LEX_CONNECTORS,
  ...GOVUK_CONNECTORS,
  ...IMO_CONNECTORS,
];

export function findConnector(id: string): Connector | undefined {
  return REGWATCH_CONNECTORS.find((c) => c.id === id);
}
