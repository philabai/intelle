/**
 * Footprint × regulatory_item scoring engine.
 *
 * Pure function — no I/O, no DB. Score is 0-100 derived from five weighted
 * dimensions; severity is bucketed for triage UI. The scorer is deliberately
 * conservative: items that match nothing in the footprint score 0 and don't
 * persist. Phase 1.5 will tune weights with feedback once we have user data.
 */

export interface FootprintInput {
  geographies: string[];                 // ISO country codes + "EU", "INT"
  activities_naics: string[];
  monitored_regulator_slugs: string[];
  monitored_topics: string[];
  substances_cas: string[];
}

export interface ItemInput {
  jurisdiction_code: string;             // "US", "EU", "UK", "AE", "INT", etc.
  topics: string[];
  naics_codes: string[];
  substances_cas: string[];
  regulator_slug: string;
}

export type Severity = "low" | "normal" | "high" | "critical";

export interface MatchReason {
  geo: { matched: boolean; via: string | null };
  regulator: { matched: boolean; via: string | null };
  topic: { matched: string[]; score: number };
  naics: { matched: string[]; score: number };
  substance: { matched: string[]; score: number };
}

export interface ScoreResult {
  score: number;          // 0-100, rounded to two decimals
  severity: Severity;
  reason: MatchReason;
}

const WEIGHTS = {
  geography: 20,
  regulator: 20,
  topic: 20,
  naics: 20,
  substance: 20,
};

// Countries that imply EU jurisdiction match. Order matters only for clarity.
const EU_MEMBER_CODES = new Set([
  "DE", "FR", "NL", "IT", "ES", "BE", "DK", "FI", "SE", "PL", "NO",
  // (Norway isn't EU but follows EU rules; keep for footprint mapping)
]);

function intersect(a: string[], b: string[]): string[] {
  if (a.length === 0 || b.length === 0) return [];
  const set = new Set(a);
  const result: string[] = [];
  for (const x of b) if (set.has(x)) result.push(x);
  return result;
}

function scoreGeography(
  footprint: FootprintInput,
  item: ItemInput,
): MatchReason["geo"] {
  const j = item.jurisdiction_code;
  if (footprint.geographies.includes(j)) {
    return { matched: true, via: j };
  }
  // INT items (IMO, IFRS, IFC) are always treated as relevant when the user
  // has configured any geography — international frameworks transcend country.
  if (j === "INT" && footprint.geographies.length > 0) {
    return { matched: true, via: "INT" };
  }
  // EU items match if the footprint contains any EU member state, even when
  // the literal "EU" code is absent — operators rarely tick the EU box explicitly.
  if (j === "EU") {
    if (footprint.geographies.includes("EU")) {
      return { matched: true, via: "EU" };
    }
    for (const code of footprint.geographies) {
      if (EU_MEMBER_CODES.has(code)) {
        return { matched: true, via: code };
      }
    }
  }
  return { matched: false, via: null };
}

function scoreTopics(
  footprint: FootprintInput,
  item: ItemInput,
): MatchReason["topic"] {
  if (footprint.monitored_topics.length === 0 || item.topics.length === 0) {
    return { matched: [], score: 0 };
  }
  const matched = intersect(footprint.monitored_topics, item.topics);
  if (matched.length === 0) return { matched: [], score: 0 };
  // Score = weight × (matched / size of the smaller set). Both 1 match in 1
  // topic and 3 matches in 3 topics yield the full 20.
  const denom = Math.min(footprint.monitored_topics.length, item.topics.length);
  const score = Math.round((WEIGHTS.topic * matched.length) / denom);
  return { matched, score: Math.min(score, WEIGHTS.topic) };
}

function scoreNaics(
  footprint: FootprintInput,
  item: ItemInput,
): MatchReason["naics"] {
  if (footprint.activities_naics.length === 0 || item.naics_codes.length === 0) {
    return { matched: [], score: 0 };
  }
  // NAICS codes are hierarchical (2111 contains 211120). Treat an item code
  // that starts with any footprint prefix (or vice versa) as a match.
  const matched: string[] = [];
  for (const itemCode of item.naics_codes) {
    for (const fpCode of footprint.activities_naics) {
      if (itemCode.startsWith(fpCode) || fpCode.startsWith(itemCode)) {
        matched.push(itemCode);
        break;
      }
    }
  }
  if (matched.length === 0) return { matched: [], score: 0 };
  const denom = Math.min(footprint.activities_naics.length, item.naics_codes.length);
  const score = Math.round((WEIGHTS.naics * matched.length) / denom);
  return { matched, score: Math.min(score, WEIGHTS.naics) };
}

function scoreSubstances(
  footprint: FootprintInput,
  item: ItemInput,
): MatchReason["substance"] {
  if (footprint.substances_cas.length === 0 || item.substances_cas.length === 0) {
    return { matched: [], score: 0 };
  }
  const matched = intersect(footprint.substances_cas, item.substances_cas);
  if (matched.length === 0) return { matched: [], score: 0 };
  // Substance match is high-signal — even one CAS overlap is meaningful.
  // Score = weight × min(matched, 3) / 3, so 1 match = 7, 3+ matches = 20.
  const score = Math.round((WEIGHTS.substance * Math.min(matched.length, 3)) / 3);
  return { matched, score: Math.min(score, WEIGHTS.substance) };
}

function scoreRegulator(
  footprint: FootprintInput,
  item: ItemInput,
): MatchReason["regulator"] {
  if (footprint.monitored_regulator_slugs.includes(item.regulator_slug)) {
    return { matched: true, via: item.regulator_slug };
  }
  return { matched: false, via: null };
}

function severityFor(score: number): Severity {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "normal";
  return "low";
}

/**
 * Returns null when the item's score is below the persistence threshold — the
 * pipeline can then skip writing the row entirely and keep footprint_matches
 * focused on items the user actually cares about.
 */
export const MIN_PERSIST_SCORE = 15;

export function scoreItem(
  footprint: FootprintInput,
  item: ItemInput,
): ScoreResult | null {
  const geo = scoreGeography(footprint, item);
  const regulator = scoreRegulator(footprint, item);
  const topic = scoreTopics(footprint, item);
  const naics = scoreNaics(footprint, item);
  const substance = scoreSubstances(footprint, item);

  const score =
    (geo.matched ? WEIGHTS.geography : 0) +
    (regulator.matched ? WEIGHTS.regulator : 0) +
    topic.score +
    naics.score +
    substance.score;

  if (score < MIN_PERSIST_SCORE) return null;

  return {
    score: Math.min(Math.round(score * 100) / 100, 100),
    severity: severityFor(score),
    reason: { geo, regulator, topic, naics, substance },
  };
}
