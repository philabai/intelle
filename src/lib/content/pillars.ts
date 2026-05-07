import type { ArticlePillar } from "@/lib/types";

export const PILLARS: Record<
  ArticlePillar,
  { label: string; oneLine: string; guidance: string }
> = {
  industry_insight: {
    label: "Industry Insight",
    oneLine: "Observations from primary research.",
    guidance:
      "Lead with a specific observation drawn from recent primary research, market signals, or fieldwork. " +
      "Cite real data points (publicly verifiable: capex figures, regulatory dates, named programs) but never " +
      "fabricate numbers. The voice is the senior practitioner reporting what they're seeing this quarter.",
  },
  service_spotlight: {
    label: "Service Spotlight",
    oneLine: "Deep-but-accessible look at one of the 11 services.",
    guidance:
      "Anchor in a specific intelle.io service (Energy Research, Standards, AI & Digitalization, Technology " +
      "Scouting, Market Intelligence, Patent & IP, Strategic Engagements, Adoption & Value Realization, " +
      "Requirements Digitalization, Knowledge Management, Standards Advisory). Open with a real client " +
      "problem, walk through the methodology, end with the shape of the deliverable. Should drive a discovery " +
      "call request without being a pitch.",
  },
  founder_pov: {
    label: "Founder / Practitioner POV",
    oneLine: "Senior point of view on industrial AI, energy transition, standards.",
    guidance:
      "First-person voice from a 25-year practitioner. Take a clear position. Argue against a piece of " +
      "conventional wisdom or call out a pattern Tier-1 decks won't acknowledge. Heavy on judgment, sparing " +
      "with hedging. The reader should finish either nodding or uncomfortable.",
  },
  case_archetype: {
    label: "Case Archetype",
    oneLine: "Anonymized 'what a project looks like'.",
    guidance:
      "Composite, anonymized engagement narrative. Structure: situation, capability gap, what we did " +
      "(specific 4-12 week scope), outcome with concrete metric, brief reflection. Always include the " +
      'disclaimer line: "Composite archetype illustrative of delivery shape; named reference engagements ' +
      'available under NDA." Never name real clients.',
  },
  resource: {
    label: "Resource / Framework",
    oneLine: "Diagnostic checklists, '10-question evaluator,' '5-step roadmap.'",
    guidance:
      "The highest-converting pillar — design it as a lead magnet. A numbered framework, evaluator, or " +
      "checklist the reader can apply tomorrow. End with a CTA to get the full version (DM / contact). " +
      "Headings, bullets, and structure matter more than prose flow.",
  },
};

export const PILLAR_KEYS = Object.keys(PILLARS) as ArticlePillar[];
