import type { Connector } from "./types";
import { makePressPageConnector } from "./_press-page";

/**
 * Phase 1.x — four new press-page connectors built on the shared helper.
 *
 * Each was verified live (the index URL returns scrapable static HTML with
 * article anchors using the documented prefix). Bot-blocked publishers
 * (ECHA, IRENA) and dynamically-rendered pages (IFRS) are NOT included
 * here — see project memory `regwatch-blocked-publishers-backlog` for the
 * forward plan on those.
 *
 * All four follow the same shape: scrape index → emit one item per article →
 * enrichment cron populates topics/substances/NAICS via Claude Haiku.
 */

const ESMA_NEWS: Connector = makePressPageConnector({
  id: "esma-news",
  label: "ESMA — Press news index",
  regulator_slug: "eu-esma",
  jurisdiction_code: "EU",
  origin: "https://www.esma.europa.eu",
  index_url: "https://www.esma.europa.eu/press-news/esma-news",
  article_path_prefix: "/press-news/esma-news/",
  citation_prefix: "ESMA news",
  default_topics: ["reporting", "carbon-market"],
});

const IEA_NEWS: Connector = makePressPageConnector({
  id: "iea-news",
  label: "IEA — News index",
  regulator_slug: "int-iea",
  jurisdiction_code: "INT",
  origin: "https://www.iea.org",
  index_url: "https://www.iea.org/news",
  article_path_prefix: "/news/",
  citation_prefix: "IEA news",
  default_topics: ["methane", "emissions", "carbon-market"],
});

// IEA also publishes a parallel /commentaries/ stream with policy analysis —
// same content type, different URL prefix. Worth a second connector.
const IEA_COMMENTARIES: Connector = makePressPageConnector({
  id: "iea-commentaries",
  label: "IEA — Commentaries index",
  regulator_slug: "int-iea",
  jurisdiction_code: "INT",
  origin: "https://www.iea.org",
  index_url: "https://www.iea.org/commentaries",
  article_path_prefix: "/commentaries/",
  citation_prefix: "IEA commentary",
  default_topics: ["methane", "emissions", "carbon-market", "reporting"],
});

const NSTA_NEWS: Connector = makePressPageConnector({
  id: "nsta-news",
  label: "NSTA — News & publications index",
  regulator_slug: "uk-nstauthority",
  jurisdiction_code: "UK",
  origin: "https://www.nstauthority.co.uk",
  index_url: "https://www.nstauthority.co.uk/news-publications/news/",
  article_path_prefix: "/news-publications/",
  citation_prefix: "NSTA news",
  default_topics: ["methane", "permitting", "emissions"],
});

const ADNOC_PRESS: Connector = makePressPageConnector({
  id: "adnoc-press-releases",
  label: "ADNOC — Press releases index",
  regulator_slug: "ae-adnoc-hse",
  jurisdiction_code: "AE",
  origin: "https://adnoc.ae",
  index_url: "https://adnoc.ae/en/news-and-media",
  article_path_prefix: "/en/news-and-media/press-releases/",
  citation_prefix: "ADNOC press",
  default_topics: ["methane", "emissions", "process-safety", "worker-safety"],
});

export const PHASE_1X_CONNECTORS: Connector[] = [
  ESMA_NEWS,
  IEA_NEWS,
  IEA_COMMENTARIES,
  NSTA_NEWS,
  ADNOC_PRESS,
];
