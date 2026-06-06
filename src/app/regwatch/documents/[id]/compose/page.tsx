import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { getMyMembership } from "@/lib/regwatch/members";
import {
  getDocument,
  DOCUMENT_KIND_LABEL,
} from "@/lib/regwatch/internal-documents";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";
import { ComposeWorkspace } from "@/components/regwatch/documents/compose/ComposeWorkspace";
import { getTemplate } from "@/lib/regwatch/templates/registry";
import type { SemVer } from "@/lib/regwatch/templates/version";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ComposeDocumentPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/regwatch/login?next=/regwatch/documents/${id}/compose`);
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

  const doc = await getDocument(id);
  if (!doc) notFound();

  const membership = await getMyMembership();
  const canEdit =
    membership?.role === "owner" || membership?.role === "admin";
  if (!canEdit) {
    return (
      <RegwatchAppShell authed>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Read-only access
          </h1>
          <p className="mt-2 text-sm text-muted">
            Only owners and admins can compose documents in this organization.
          </p>
        </div>
      </RegwatchAppShell>
    );
  }

  const svc = createServiceClient();
  const { data: bodyRow } = await svc
    .from("internal_documents")
    .select("body_doc, template_key, updated_at")
    .eq("id", id)
    .maybeSingle();
  let bodyDoc: unknown = bodyRow?.body_doc ?? null;
  const templateKey = (bodyRow?.template_key as string | null) ?? null;
  if (!bodyDoc && templateKey) {
    const t = getTemplate(templateKey);
    if (t) bodyDoc = t.prosemirrorJson;
  }
  const initialUpdatedAt =
    (bodyRow?.updated_at as string | undefined) ?? doc.updatedAt;

  const { data: revRow } = await svc
    .from("internal_document_revisions")
    .select("version_major, version_minor, version_patch")
    .eq("internal_document_id", id)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const currentVersion: SemVer | null = revRow
    ? {
        major: revRow.version_major as number,
        minor: revRow.version_minor as number,
        patch: revRow.version_patch as number,
      }
    : null;

  const subtitleParts = [
    DOCUMENT_KIND_LABEL[doc.docKind],
    doc.internalCode,
  ].filter((p): p is string => Boolean(p));

  return (
    <RegwatchAppShell authed>
      <ComposeWorkspace
        documentId={doc.id}
        documentTitle={doc.title}
        documentSubtitle={subtitleParts.join(" · ")}
        initialBodyDoc={bodyDoc}
        initialUpdatedAt={initialUpdatedAt}
        currentVersion={currentVersion}
      />
    </RegwatchAppShell>
  );
}
