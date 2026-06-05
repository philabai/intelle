import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/regwatch/supabase/server";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { getMyMembership } from "@/lib/regwatch/members";
import {
  getDocument,
  DOCUMENT_KIND_LABEL,
} from "@/lib/regwatch/internal-documents";
import { listAssets, getHierarchyConfig } from "@/lib/regwatch/assets";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";
import { UploadFileForm } from "@/components/regwatch/documents/UploadFileForm";
import { LinkRegulationForm } from "@/components/regwatch/documents/LinkRegulationForm";
import { LinkAssetsPanel } from "@/components/regwatch/documents/LinkAssetsPanel";

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

  const [membership, org, allAssets] = await Promise.all([
    getMyMembership(),
    getMyOrganization(),
    listAssets(),
  ]);
  const canEdit =
    membership?.role === "owner" || membership?.role === "admin";
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
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/documents" className="hover:text-foreground">
            Internal documents
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{doc.title}</span>
        </nav>

        <header className="mt-4 mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
            {DOCUMENT_KIND_LABEL[doc.docKind]}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
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
          <section className="space-y-6">
            <div className="rounded-xl border border-card-border bg-card-bg/40 p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Linked regulations
              </h2>
              <LinkRegulationForm
                documentId={doc.id}
                existingLinks={doc.links.map((l) => ({
                  id: l.id,
                  regulatoryItemId: l.regulatoryItemId,
                  regulationCitation: l.regulationCitation,
                  regulationTitle: l.regulationTitle,
                  jurisdictionCode: l.jurisdictionCode,
                  clauseAnchor: l.clauseAnchor,
                  linkRationale: l.linkRationale,
                  supersededAt: l.supersededAt,
                }))}
              />
            </div>

            <div className="rounded-xl border border-card-border bg-card-bg/40 p-5">
              <h2 className="mb-1 text-sm font-semibold text-foreground">
                Linked assets
              </h2>
              <p className="mb-3 text-xs text-muted">
                Pin this document to the {levelLabels[2]}s, {levelLabels[3]}s,
                {" "}{levelLabels[4]}s, or {levelLabels[5]}s it applies to.
                Linking at any level applies to every descendant.
              </p>
              <LinkAssetsPanel
                documentId={doc.id}
                allAssets={allAssets.map((a) => ({
                  id: a.id,
                  parentId: a.parentId,
                  level: a.level,
                  name: a.name,
                  code: a.code,
                }))}
                levelLabels={levelLabels}
                currentLinks={doc.assetLinks.map((l) => ({
                  linkId: l.id,
                  assetId: l.assetId,
                  assetName: l.assetName,
                  assetLevel: l.assetLevel,
                  assetCode: l.assetCode,
                }))}
                canEdit={canEdit || membership !== null}
              />
            </div>

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
