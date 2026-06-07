import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import { createServiceClient } from "@/lib/regwatch/supabase/service";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { getMyMembership } from "@/lib/regwatch/members";
import {
  getDocument,
  DOCUMENT_KIND_LABEL,
} from "@/lib/regwatch/internal-documents";
import { listAssets, getHierarchyConfig } from "@/lib/regwatch/assets";
import {
  listFolders,
  buildFolderTree,
  getFolderBreadcrumb,
  getFolder,
} from "@/lib/regwatch/document-folders";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";
import { UploadFileForm } from "@/components/regwatch/documents/UploadFileForm";
import { MoveDocumentMenu } from "@/components/regwatch/documents/MoveDocumentMenu";
import { DocBodyPreviewCard } from "@/components/regwatch/documents/editor/DocBodyPreviewCard";
import { DocActionsClient } from "@/components/regwatch/documents/DocActionsClient";
import { getReviewBundle } from "@/lib/regwatch/internal-document-review";
import { listMyOrgMembers } from "@/lib/regwatch/members";
import { getTemplate } from "@/lib/regwatch/templates/registry";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/regwatch/login?next=/regwatch/documents/${id}`);

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

  // Pull body_doc + template_key separately — neither lives on getDocument
  // (it's an editor-only concern). Server component → service client is fine.
  const svc = createServiceClient();
  const { data: bodyRow } = await svc
    .from("internal_documents")
    .select("body_doc, template_key")
    .eq("id", id)
    .maybeSingle();
  let bodyDoc: unknown = bodyRow?.body_doc ?? null;
  const templateKey = (bodyRow?.template_key as string | null) ?? null;
  if (!bodyDoc && templateKey) {
    // Show the template default as a preview until the first save.
    const t = getTemplate(templateKey);
    if (t) bodyDoc = t.prosemirrorJson;
  }

  const [membership, org, allAssets, folders, orgMembersAll] = await Promise.all([
    getMyMembership(),
    getMyOrganization(),
    listAssets(),
    listFolders(),
    listMyOrgMembers(),
  ]);
  const canEdit =
    membership?.role === "owner" || membership?.role === "admin";

  // Review bundle (assignments + signatures + audit events).
  const reviewBundle = membership
    ? await getReviewBundle(doc.id, membership.organizationId)
    : null;

  // Derive the current user's role-on-doc for action gating.
  let currentRoleOnDoc: "owner" | "reviewer" | "approver" | "admin" | null = null;
  if (membership) {
    if (membership.role === "owner" || membership.role === "admin") {
      currentRoleOnDoc = "admin";
    } else if (doc.ownerUserId === user.id) {
      currentRoleOnDoc = "owner";
    } else {
      const open = reviewBundle?.assignments.find(
        (a) => a.userId === user.id && !a.completedAt,
      );
      if (open) currentRoleOnDoc = open.role as "reviewer" | "approver";
    }
  }

  const orgMembersForPanel = orgMembersAll.map((m) => ({
    userId: m.userId,
    displayName: m.fullName ?? m.email ?? m.userId.slice(0, 8),
    email: m.email,
    role: m.functionalRoleLabel,
  }));
  const folderTree = buildFolderTree(folders);
  const folderBreadcrumb = doc.folderId
    ? await getFolderBreadcrumb(doc.folderId)
    : [];
  const currentFolder = doc.folderId ? await getFolder(doc.folderId) : null;
  const config = await getHierarchyConfig(org?.organization.id ?? "");
  const levelLabels: Record<2 | 3 | 4 | 5 | 6, string> = {
    2: config.level2Label,
    3: config.level3Label,
    4: config.level4Label,
    5: config.level5Label,
    6: config.level6Label ?? "Component",
  };

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/documents" className="hover:text-foreground">
            Internal documents
          </Link>
          {folderBreadcrumb.map((f) => (
            <span key={f.id}>
              <span className="mx-2">/</span>
              <Link
                href={`/regwatch/documents?folder=${f.id}`}
                className="hover:text-foreground"
              >
                {f.name}
              </Link>
            </span>
          ))}
          {currentFolder && (
            <>
              <span className="mx-2">/</span>
              <Link
                href={`/regwatch/documents?folder=${currentFolder.id}`}
                className="hover:text-foreground"
              >
                {currentFolder.name}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-foreground">{doc.title}</span>
        </nav>

        <header className="mt-4 mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {DOCUMENT_KIND_LABEL[doc.docKind]}
          </p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
            {doc.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
            {doc.internalCode && (
              <span className="font-mono">{doc.internalCode}</span>
            )}
            {doc.version && <span>· {doc.version}</span>}
            <span>
              · Owner: {doc.ownerName ?? doc.ownerEmail ?? "—"}
              {doc.ownerRole ? ` (${doc.ownerRole})` : ""}
            </span>
            <span>· Status: {doc.status}</span>
          </div>
        </header>

        {doc.description && (
          <p className="mb-6 max-w-3xl text-sm text-foreground/80">
            {doc.description}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="min-w-0 space-y-6">
            {reviewBundle && membership && (
              <DocActionsClient
                documentId={doc.id}
                reviewState={reviewBundle.reviewState}
                ownerUserId={reviewBundle.ownerUserId}
                ownerDisplayName={reviewBundle.ownerDisplayName}
                currentUserId={user.id}
                currentUserRoleOnDoc={currentRoleOnDoc}
                isOrgAdmin={canEdit}
                assignments={reviewBundle.assignments}
                signatures={reviewBundle.signatures}
                auditEvents={reviewBundle.auditEvents}
                orgMembers={orgMembersForPanel}
                regulationLinks={doc.links.map((l) => ({
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
                allAssets={allAssets.map((a) => ({
                  id: a.id,
                  parentId: a.parentId,
                  level: a.level,
                  name: a.name,
                  code: a.code,
                }))}
                levelLabels={levelLabels}
                currentAssetLinks={doc.assetLinks.map((l) => ({
                  linkId: l.id,
                  assetId: l.assetId,
                  assetName: l.assetName,
                  assetLevel: l.assetLevel,
                  assetCode: l.assetCode,
                }))}
                composeHref={`/regwatch/documents/${doc.id}/compose`}
              />
            )}

            <DocBodyPreviewCard
              documentId={doc.id}
              editHref={`/regwatch/documents/${doc.id}/edit`}
              composeHref={`/regwatch/documents/${doc.id}/compose`}
              canEdit={canEdit}
              hasBody={!!bodyDoc}
              hasFile={!!doc.filePath}
            />

            {doc.links.some((l) => l.supersededAt) && (
              <div className="rounded-xl border border-card-border bg-card-bg/20 p-5">
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
                  Superseded links
                </h2>
                <ul className="space-y-2 text-xs text-muted">
                  {doc.links
                    .filter((l) => l.supersededAt)
                    .map((l) => (
                      <li key={l.id}>
                        <span className="font-mono">{l.regulationCitation}</span>{" "}
                        — superseded {l.supersededAt}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-xl border border-card-border bg-card-bg/40 p-4">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
                File
              </h2>
              {doc.filePath ? (
                <div className="space-y-2 text-xs text-foreground">
                  <p className="font-mono">{doc.fileName}</p>
                  {doc.fileSize && (
                    <p className="text-muted">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </p>
                  )}
                  <p className="text-[10px] text-muted">
                    Downloads use 60-second signed URLs; admin must use the
                    download action from the obligations detail page.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted">No file uploaded yet.</p>
              )}
              {canEdit && (
                <div className="mt-3">
                  <UploadFileForm
                    documentId={doc.id}
                    currentFileName={doc.fileName}
                  />
                </div>
              )}
            </section>

            <section className="rounded-xl border border-card-border bg-card-bg/40 p-4">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
                Folder
              </h2>
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs text-foreground">
                  {currentFolder ? currentFolder.name : "Unfiled"}
                </p>
                <MoveDocumentMenu
                  documentId={doc.id}
                  currentFolderId={doc.folderId}
                  folderRoots={folderTree}
                  label="Move"
                />
              </div>
            </section>

            <section className="rounded-xl border border-card-border bg-card-bg/40 p-4">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
                Lifecycle
              </h2>
              <dl className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <dt className="text-muted">Effective</dt>
                  <dd className="text-foreground">
                    {doc.effectiveDate ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Next review</dt>
                  <dd className="text-foreground">
                    {doc.nextReviewDate ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Created</dt>
                  <dd className="text-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Updated</dt>
                  <dd className="text-foreground">
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </RegwatchAppShell>
  );
}
