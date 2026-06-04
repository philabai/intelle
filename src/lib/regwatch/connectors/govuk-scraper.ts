import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * UK GOV.UK consultations scraper — proof-of-concept for sources that don't
 * publish a clean REST API. GOV.UK exposes a JSON content-API at
 * https://www.gov.uk/api/content/<path>, but the listing index requires either
 * the Search API (free, public) or HTML scraping. The Search API is JSON so we
 * use it preferentially; the HTML parse path is a fallback used for the
 * regional regulators (ADNOC, MEWA, QPSA) once Phase 1.x adds them.
 *
 * Honour each portal's robots.txt; cache-aware fetch keeps load minimal.
 */
const SEARCH_API =
  "https://www.gov.uk/api/search.json?filter_organisations=health-and-safety-executive&order=-public_timestamp&fields=title,description,public_timestamp,link,format,display_type&count=50";

interface GovUkResult {
  title: string;
  description: string | null;
  public_timestamp: string | null;
  link: string;
  format: string | null;
  display_type: string | null;
}

interface GovUkSearchResponse {
  results: GovUkResult[];
}

export function makeGovUkConnector(args: {
  id: string;
  label: string;
  regulator_slug: string;
  organisation_slug: string;
}): Connector {
  return {
    id: args.id,
    label: args.label,
    regulator_slug: args.regulator_slug,

    async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
      const result: ConnectorResult = {
        source: args.id,
        fetched: 0,
        errors: [],
        items: [],
      };

      const url = SEARCH_API.replace(
        "filter_organisations=health-and-safety-executive",
        `filter_organisations=${encodeURIComponent(args.organisation_slug)}`,
      );

      if (ctx.dryRun) {
        result.errors.push(`dryRun — would fetch ${url}`);
        return result;
      }

      let json: GovUkSearchResponse;
      try {
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": "intelle-regwatch/0.1 (https://intelle.io/regwatch)",
          },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          result.errors.push(`HTTP ${res.status} from GOV.UK Search API`);
          return result;
        }
        json = (await res.json()) as GovUkSearchResponse;
      } catch (e) {
        result.errors.push(`network: ${(e as Error).message}`);
        return result;
      }

      const since =
        ctx.now.getTime() - ctx.lookbackDays * 24 * 60 * 60 * 1000;
      result.fetched = json.results.length;

      for (const row of json.results) {
        if (!row.public_timestamp) continue;
        const published = new Date(row.public_timestamp);
        if (published.getTime() < since) continue;
        const fullUrl = row.link.startsWith("http")
          ? row.link
          : `https://www.gov.uk${row.link}`;
        const citation = row.link.startsWith("/")
          ? `gov.uk${row.link}`
          : row.link;
        const isConsultation =
          (row.format ?? "").includes("consultation") ||
          (row.display_type ?? "").toLowerCase().includes("consultation");
        const item: NormalisedItem = {
          regulator_slug: args.regulator_slug,
          citation,
          slug: citationSlug(citation),
          title: row.title,
          instrument_type: isConsultation ? "consultation" : "guidance",
          status: isConsultation ? "consultation-open" : "in-force",
          effective_date: null,
          proposed_date: null,
          consultation_closes_at: null,
          published_at: published.toISOString(),
          last_changed_at: published.toISOString(),
          source_url: fullUrl,
          summary: row.description,
          body_text: row.description,
          body_html: null,
          jurisdiction_code: "UK",
        };
        result.items.push(item);
      }
      return result;
    },
  };
}

export const GOVUK_CONNECTORS: Connector[] = [
  makeGovUkConnector({
    id: "govuk-hse",
    label: "GOV.UK — HSE",
    regulator_slug: "uk-hse",
    organisation_slug: "health-and-safety-executive",
  }),
  makeGovUkConnector({
    id: "govuk-ea",
    label: "GOV.UK — Environment Agency",
    regulator_slug: "uk-ea",
    organisation_slug: "environment-agency",
  }),
  makeGovUkConnector({
    id: "govuk-desnz",
    label: "GOV.UK — DESNZ",
    regulator_slug: "uk-desnz",
    organisation_slug: "department-for-energy-security-and-net-zero",
  }),
];
