import type { Metadata } from "next";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { EngineeringServiceDetail } from "@/components/engineering/EngineeringServiceDetail";

const service = ENGINEERING_SERVICES[3];
export const metadata: Metadata = {
  title:
    "Engineering Knowledge Management Implementation | GenAI, RAG, Goldfire, Sinequa, Glean | intelle.io",
  description:
    "Deploy AI-powered semantic search, GenAI / RAG, and engineering-content platforms. Vendor-neutral evaluation across Accuris Goldfire, Goldfire Chat, Sinequa, Coveo, Glean, Microsoft Copilot, Lucidworks, Mindbreeze, IntraFind, AlphaSense, OpenText. Implementation depth on Goldfire and OpenText / Documentum.",
  keywords: [
    "engineering knowledge management implementation",
    "semantic search engineering",
    "GenAI engineering",
    "RAG engineering search",
    "Accuris Goldfire",
    "Goldfire Chat",
    "Sinequa engineering",
    "Glean engineering",
    "Microsoft Copilot engineering",
    "OpenText Documentum",
    "GraphRAG",
    "agentic RAG",
    "domain-tuned embeddings",
    "citation grounding",
    "engineering taxonomy design",
  ],
  alternates: { canonical: service.href },
  openGraph: {
    title: "Engineering Knowledge Management Solutions Implementation",
    description:
      "GenAI / RAG and semantic search deployment for engineering. Goldfire, Sinequa, Glean, OpenText. Hybrid retrieval, GraphRAG, citation grounding.",
    url: service.href,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Engineering Knowledge Management Implementation",
  },
};

export default function KnowledgeManagementImplementationPage() {
  return <EngineeringServiceDetail service={service} />;
}
