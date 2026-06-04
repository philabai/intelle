import type {
  Connector,
  ConnectorResult,
  ConnectorRunContext,
  InstrumentType,
  ItemStatus,
  NormalisedItem,
} from "./types";
import { citationSlug } from "./types";

/**
 * US Federal Register connector — public REST API at federalregister.gov.
 * No API key required, rate limit is generous (10 req/sec).
 *
 * Fetches all rule, proposed-rule, and notice documents touching the configured
 * EPA agency slug within the lookback window. Phase 1.x can fan out across the
 * other US federal agencies (OSHA, BSEE, BLM, BOEM, PHMSA) by varying the
 * `conditions[agencies][]` slug.
 *
 * Docs: https://www.federalregister.gov/developers/documentation/api/v1
 */
const API_BASE = "https://www.federalregister.gov/api/v1/documents.json";

interface FRApiDoc {
  document_number: string;
  title: string;
  abstract: string | null;
  document_type: string; // "Rule" | "Proposed Rule" | "Notice" | "Presidential Document"
  publication_date: string; // YYYY-MM-DD
  effective_on: string | null; // YYYY-MM-DD
  comments_close_on: string | null;
  html_url: string;
  body_html_url: string | null;
  cfr_references: { title: number; part: number }[] | null;
  citation: string | null; // e.g. "89 FR 16280"
  agencies: { slug?: string; name?: string }[];
}

interface FRApiResponse {
  results: FRApiDoc[];
  count: number;
}

function instrumentTypeFor(docType: string): InstrumentType {
  switch (docType) {
    case "Rule":
      return "final-rule";
    case "Proposed Rule":
      return "proposed-rule";
    case "Notice":
      return "notice";
    case "Presidential Document":
      return "primary-legislation";
    default:
      return "notice";
  }
}

function statusFor(doc: FRApiDoc, now: Date): ItemStatus {
  if (doc.document_type === "Proposed Rule") {
    if (doc.comments_close_on) {
      const close = new Date(doc.comments_close_on);
      return close > now ? "consultation-open" : "consultation-closed";
    }
    return "proposed";
  }
  return "in-force";
}

function makeConnector(args: {
  id: string;
  label: string;
  regulator_slug: string;
  agency_slug: string;
}): Connector {
  return {
    id: args.id,
    label: args.label,
    regulator_slug: args.regulator_slug,

    async run(ctx: ConnectorRunContext): Promise<ConnectorResult> {
      const since = new Date(ctx.now.getTime() - ctx.lookbackDays * 24 * 60 * 60 * 1000);
      const sinceIso = since.toISOString().slice(0, 10);
      const params = new URLSearchParams({
        per_page: "50",
        order: "newest",
        "conditions[publication_date][gte]": sinceIso,
        "conditions[agencies][]": args.agency_slug,
      });
      const url = `${API_BASE}?${params.toString()}`;

      const result: ConnectorResult = {
        source: args.id,
        fetched: 0,
        errors: [],
        items: [],
      };

      if (ctx.dryRun) {
        result.errors.push(`dryRun — would fetch ${url}`);
        return result;
      }

      let json: FRApiResponse;
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json", "User-Agent": "intelle-regwatch/0.1" },
          // Vercel functions have a default 25s timeout on Hobby; trim with our own.
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          result.errors.push(`HTTP ${res.status} from Federal Register`);
          return result;
        }
        json = (await res.json()) as FRApiResponse;
      } catch (e) {
        result.errors.push(`network: ${(e as Error).message}`);
        return result;
      }

      result.fetched = json.results.length;

      for (const doc of json.results) {
        // The "89 FR 16280" style cite is null for some doc types (Presidential
        // Documents, certain Notices). document_number is always present and
        // unique within FR, so we fall back to it. Display retains the FR cite
        // when available so users see the human-readable form.
        if (!doc.document_number) continue;
        const citation = doc.citation || `FR-${doc.document_number}`;
        const item: NormalisedItem = {
          regulator_slug: args.regulator_slug,
          citation,
          slug: citationSlug(citation),
          title: doc.title,
          instrument_type: instrumentTypeFor(doc.document_type),
          status: statusFor(doc, ctx.now),
          effective_date: doc.effective_on,
          proposed_date:
            doc.document_type === "Proposed Rule" ? doc.publication_date : null,
          consultation_closes_at: doc.comments_close_on
            ? new Date(doc.comments_close_on).toISOString()
            : null,
          published_at: new Date(doc.publication_date).toISOString(),
          last_changed_at: new Date(doc.publication_date).toISOString(),
          source_url: doc.html_url,
          summary: doc.abstract,
          body_text: doc.abstract, // body_html_url fetched at enrichment time
          body_html: null,
          jurisdiction_code: "US",
        };
        result.items.push(item);
      }
      return result;
    },
  };
}

// Pre-configured per-agency variants. Add more by appending to the array.
export const FEDERAL_REGISTER_CONNECTORS: Connector[] = [
  makeConnector({
    id: "fr-epa",
    label: "Federal Register — EPA",
    regulator_slug: "us-epa",
    agency_slug: "environmental-protection-agency",
  }),
  makeConnector({
    id: "fr-osha",
    label: "Federal Register — OSHA",
    regulator_slug: "us-osha",
    agency_slug: "occupational-safety-and-health-administration",
  }),
  makeConnector({
    id: "fr-bsee",
    label: "Federal Register — BSEE",
    regulator_slug: "us-bsee",
    agency_slug: "safety-and-environmental-enforcement-bureau",
  }),
  makeConnector({
    id: "fr-blm",
    label: "Federal Register — BLM",
    regulator_slug: "us-blm",
    agency_slug: "land-management-bureau",
  }),
  makeConnector({
    id: "fr-phmsa",
    label: "Federal Register — PHMSA",
    regulator_slug: "us-phmsa",
    agency_slug: "pipeline-and-hazardous-materials-safety-administration",
  }),
  makeConnector({
    id: "fr-sec",
    label: "Federal Register — SEC",
    regulator_slug: "us-sec",
    agency_slug: "securities-and-exchange-commission",
  }),
];
