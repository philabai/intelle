import { FAQSection } from "@/components/seo/FAQSection";
import { JsonLd, faqSchema } from "@/lib/seo/json-ld";
import type { FAQ } from "@/lib/types";

const HOME_FAQS: FAQ[] = [
  {
    q: "How is intelle.io different from Tier-1 consultancies?",
    a: "Tier-1 firms staff engagements with junior analysts using templates. We deliver senior-practitioner work end-to-end. Comparable output quality, 30–50% lower cost, and a quarter of the turnaround. The founder has 25+ years across S&P Global, IHS Markit, GE Energy, Accuris (a KKR portfolio company), and Sapient Consulting.",
  },
  {
    q: "Do you serve mid-tier EPCs and scale-ups, or only Fortune 500 NOCs?",
    a: "Both. We deliberately serve mid-tier EPCs and industrial scale-ups who need decision-grade intelligence but can't afford Tier-1 fees. NOC innovation arms get the same senior-led work — engagement shape adapts to scope.",
  },
  {
    q: "Where are you based and which markets do you cover?",
    a: "Headquartered in Dubai (SparkLab LLC). Primary coverage: GCC (Saudi, UAE, Qatar, Kuwait, Oman, Bahrain) and India. Secondary coverage: global English-language markets where industrial AI, energy transition, or standards work has cross-border relevance.",
  },
  {
    q: "What types of engagements do you take on?",
    a: "Two service tracks: Research & Innovation (energy research, standards, industrial AI, technology scouting, market intelligence, patent IP, strategic engagements) and Implementation (Accuris adoption, PLM/ALM, knowledge management, standards advisory). Engagements typically run 2–14 weeks. Lead-gen call is free.",
  },
  {
    q: "Do you have reference engagements we can review?",
    a: "Fortune 500 reference engagements with Aramco, ADNOC, Shell, Chevron, Honeywell, Baker Hughes, and GE Energy — available under NDA on request. Public-record credentials include SAE-published research on industrial AI and CERAWeek invited-speaker status.",
  },
];

export function HomeFAQs() {
  return (
    <>
      <JsonLd data={faqSchema(HOME_FAQS)} />
      <section className="py-16 sm:py-20 border-t border-card-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <FAQSection faqs={HOME_FAQS} title="Common questions" />
        </div>
      </section>
    </>
  );
}
