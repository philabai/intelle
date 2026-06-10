import type { Connector } from "./types";
import { FEDERAL_REGISTER_CONNECTORS } from "./federal-register";
import { EUR_LEX_CONNECTORS } from "./eur-lex";
import { GOVUK_CONNECTORS } from "./govuk-scraper";
import { IMO_CONNECTORS } from "./imo-scraper";
import { PHASE_1X_CONNECTORS } from "./esma-iea-nsta-adnoc";
import { SASO_CONNECTORS } from "./saso-scraper";
import { CNSC_CONNECTORS } from "./cnsc-scraper";
import { CER_CONNECTORS } from "./cer-act";
import { ECFR_TITLE_CONNECTORS } from "./ecfr-title";
import { IEA_POLICY_CONNECTORS } from "./iea-policies";
import {
  attachEcfrHierarchy,
  FEDERAL_REGISTER_ECFR_SCOPES,
} from "./ecfr-hierarchy";

// Attach the eCFR hierarchy adapter to each Federal Register connector so
// the regwatch-hierarchy cron can build the corresponding Title/Chapter
// slice without touching the connector files themselves.
for (const c of FEDERAL_REGISTER_CONNECTORS) {
  const scope = FEDERAL_REGISTER_ECFR_SCOPES[c.id];
  if (scope) attachEcfrHierarchy(c, scope);
}

/**
 * Registry of every connector RegWatch knows about. The crawl orchestrator
 * iterates this list and persists the merged item set via the service-role
 * Supabase client.
 *
 * Backlog (publishers not yet covered):
 *  - ECHA news + REACH restriction intentions — bot-blocked (Cloudflare 403)
 *  - IFRS / ISSB news — JS-rendered, no static index
 *  - MEWA (Saudi), QPSA (Qatar) — site URLs unstable / 404 / connection-refused
 *  - eCFR point-in-time deltas — needs a real diff strategy
 *  See project memory `regwatch-blocked-publishers-backlog`.
 */
export const REGWATCH_CONNECTORS: Connector[] = [
  ...FEDERAL_REGISTER_CONNECTORS,
  ...EUR_LEX_CONNECTORS,
  ...GOVUK_CONNECTORS,
  ...IMO_CONNECTORS,
  ...PHASE_1X_CONNECTORS,
  ...SASO_CONNECTORS,
  ...CNSC_CONNECTORS,
  ...CER_CONNECTORS,
  ...ECFR_TITLE_CONNECTORS,
];

/**
 * Heavy / low-churn connectors kept OUT of the every-15-minutes crawl loop and
 * refreshed by their own dedicated cron instead. IEA fetches the whole ~20 MB
 * policies catalogue per run, so it runs once daily via
 * `/api/cron/regwatch-crawl?only=iea-policies&lookback=30`.
 */
export const SCHEDULED_ONLY_CONNECTORS: Connector[] = [
  ...IEA_POLICY_CONNECTORS,
];

/** Every connector, including the scheduled-only ones — used for lookup. */
export const ALL_CONNECTORS: Connector[] = [
  ...REGWATCH_CONNECTORS,
  ...SCHEDULED_ONLY_CONNECTORS,
];

export function findConnector(id: string): Connector | undefined {
  return ALL_CONNECTORS.find((c) => c.id === id);
}
