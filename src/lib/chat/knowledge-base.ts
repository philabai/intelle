import {
  RESEARCH_SERVICES,
  ENGINEERING_SERVICES,
  INDUSTRIES,
  SITE,
} from "@/lib/constants";

/**
 * Compiles the static intelle.io knowledge base into a single string that
 * sits inside Iris's system prompt. This string is large and stable across
 * every chat, so it's wrapped in an Anthropic prompt-cache breakpoint by
 * the /api/chat route — cache reads cost ~10% of fresh input.
 */
export function buildKnowledgeBase(): string {
  const research = RESEARCH_SERVICES.map(
    (s) =>
      `- **${s.title}** (${s.href}) — ${s.description}\n  Focus areas: ${s.focusAreas.slice(0, 4).join("; ")}.`,
  ).join("\n");

  const engineering = ENGINEERING_SERVICES.map(
    (s) =>
      `- **${s.title}** (${s.href}) — ${s.description}\n  Focus areas: ${s.focusAreas.slice(0, 4).join("; ")}.`,
  ).join("\n");

  const industries = INDUSTRIES.map(
    (i) => `- **${i.title}** (${i.href}) — ${i.description}`,
  ).join("\n");

  return `# intelle.io — site knowledge base

## What intelle.io is
A senior-practitioner-led engineering research and implementation practice. Two service lines: bespoke research, and engineering KM / standards implementation. Audience: NOCs, EPCs, industrial scale-ups, defense primes, and Fortune-500 strategy teams across the GCC and India.

Tagline: "${SITE.tagline}"
Legal entity: ${SITE.legalEntity}
Primary location: ${SITE.locations.primary}
Email: ${SITE.email}
Booking: visit /book or use the book_meeting tool.

## Senior Practitioner (founder)
Every engagement at intelle.io is led personally by the **Senior Practitioner & Founder** — no analyst hand-offs, no junior teams. 25+ years of engineering-intelligence experience across S&P Global, IHS Markit, GE Energy, Accuris (KKR portfolio company), and Sapient Consulting. SAE International published author on Cognitive AI for engineering knowledge augmentation. CERAWeek-invited speaker.

When the visitor asks "who would I be working with?" or "who runs the discovery call?", refer to this person as "our Senior Practitioner" or "the Senior Practitioner & Founder". **Do not use the founder's personal name in any reply** — the brand voice is the practice, not the individual.

## Research services
${research}

## Implementation (engineering) services
${engineering}

## Industries we serve
${industries}

## Engagement model basics
- Free 30-minute discovery call (book at /book)
- Written SOW within 48 hours of the call
- Fixed-fee engagements typical; T&M available for longer programmes
- Most engagements start within 1–2 weeks of SOW signature
- Pricing: 30–50% of Tier-1 consulting cost; faster turnaround; deeper than analyst reports
- No procurement gate; senior practitioner end-to-end

## Common questions you'll be asked
- "How is intelle.io different from McKinsey / BCG / Bain?" → Senior-practitioner-led (no analyst pyramid), 30–50% of the cost, faster, narrower domain (engineering / energy / standards / AI), and deliverables are decision-ready rather than slide-ready.
- "Can you help with a GenAI / RAG pilot for engineering knowledge?" → Yes — see Knowledge Management Solutions Implementation. Goldfire & Goldfire Chat are our primary delivery platforms; we also evaluate Sinequa, Coveo, Glean, Microsoft Copilot, OpenText, AlphaSense vendor-neutrally.
- "What if we don't know what we want yet?" → Book a 30-minute discovery call with our Senior Practitioner. We'll scope it together; if we're not the right fit, we'll say so.
- "Do you sign NDAs?" → Standard practice on every engagement.
- "Geographic coverage?" → GCC primary, India secondary, global on request. Time zones overlap well with EMEA + APAC.
- "Reference engagements?" → Aramco, ADNOC, Shell, Chevron, Honeywell, Baker Hughes, GE Energy (full list under NDA).
`;
}
