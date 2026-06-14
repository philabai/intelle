import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import { createClient } from "@/lib/regwatch/supabase/server";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import {
  getDocument,
  DOCUMENT_KIND_LABEL,
} from "@/lib/regwatch/internal-documents";
import { getInternalDocumentBody } from "@/lib/regwatch/internal-document-body-actions";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";
import { ClauseCrosswalkWorkspace } from "@/components/regwatch/documents/ClauseCrosswalkWorkspace";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function CrosswalkWorkspacePage({ params }: Props) {
  const t = await getTranslations("regwatch.documents");
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return localizedRedirect(`/regwatch/login?next=/regwatch/documents/${id}/crosswalk`);
  }

  const gate = await checkFeatureGate("internal_documents");
  if (!gate.allowed) {
    return (
      <RegwatchAppShell authed>
        <PaywallScreen
          feature="internal_documents"
          currentTier={gate.currentTier}
          requiredTier={gate.requiredTier}
        />
      </RegwatchAppShell>
    );
  }

  const [doc, body] = await Promise.all([
    getDocument(id),
    getInternalDocumentBody({ id }),
  ]);
  if (!doc) notFound();

  const fallbackBody = {
    id,
    title: doc.title,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    paragraphs: [],
    extractedChars: 0,
    usableForMapping: false,
    fallbackReason: t("crosswalkLoadFailed"),
  };

  const subtitleParts = [
    DOCUMENT_KIND_LABEL[doc.docKind],
    doc.internalCode,
    doc.version,
  ].filter((p): p is string => Boolean(p));

  return (
    <RegwatchAppShell authed>
      <ClauseCrosswalkWorkspace
        documentId={doc.id}
        documentTitle={doc.title}
        documentSubtitle={subtitleParts.join(" · ")}
        internalBody={body ?? fallbackBody}
        existingLinks={doc.links.map((l) => ({
          id: l.id,
          regulatoryItemId: l.regulatoryItemId,
          regulationCitation: l.regulationCitation,
          regulationTitle: l.regulationTitle,
          jurisdictionCode: l.jurisdictionCode,
          clauseAnchor: l.clauseAnchor,
          internalClauseAnchor: l.internalClauseAnchor,
          linkRationale: l.linkRationale,
          supersededAt: l.supersededAt,
        }))}
      />
    </RegwatchAppShell>
  );
}
