import type { Metadata } from "next";
import { RESEARCH_SERVICES } from "@/lib/constants";
import { ResearchServiceDetail } from "@/components/research/ResearchServiceDetail";

const service = RESEARCH_SERVICES[3];

export const metadata: Metadata = {
  title: "Technology Scouting Services for NOC Innovation Arms | intelle.io",
  description:
    "TRL-assessed industrial technology scouting for NOC innovation arms, corporate VCs, EPC R&D. 3-week sprint. 8-15 vendors with maturity scoring. Beyond Gartner.",
  keywords: [
    "technology scouting services NOC",
    "industrial vendor scouting",
    "hydrogen tech scouting",
    "CCUS startup scouting",
    "ADNOC technology scouting",
    "Aramco Ventures scouting",
  ],
  alternates: { canonical: service.href },
  openGraph: {
    title: "Technology Scouting for Industrial Innovation",
    description:
      "TRL-assessed scouting for NOC innovation arms, corporate VCs, EPC R&D. 3-week sprint.",
    url: service.href,
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Technology Scouting for Industrial Innovation" },
};

export default function TechnologyScoutingPage() {
  return <ResearchServiceDetail service={service} />;
}
