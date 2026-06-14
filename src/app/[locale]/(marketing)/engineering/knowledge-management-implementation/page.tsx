import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { localizeEngineeringServices } from "@/lib/constants/i18n/localize";
import { ENGINEERING_SERVICES } from "@/lib/constants";
import { EngineeringServiceDetail } from "@/components/engineering/EngineeringServiceDetail";

const service = ENGINEERING_SERVICES[3];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const s = localizeEngineeringServices(locale)[3];
  return {
    title: `${s.title}${t("detailCommon.titleSuffix")}`,
    description: s.description,
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
      title: s.title,
      description: s.description,
      url: service.href,
      type: "website",
    },
    twitter: { card: "summary_large_image", title: s.title },
  };
}

export default async function KnowledgeManagementImplementationPage() {
  const _localized = localizeEngineeringServices(await getLocale())[3];
  return <EngineeringServiceDetail service={_localized} />;
}
