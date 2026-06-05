import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { createClient } from "@/lib/regwatch/supabase/server";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { getMyMembership } from "@/lib/regwatch/members";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { listDocuments, DOCUMENT_KIND_LABEL } from "@/lib/regwatch/internal-documents";
import {
  listFolders,
  buildFolderTree,
  countUnfiledDocuments,
  getFolderBreadcrumb,
  getFolder,
} from "@/lib/regwatch/document-folders";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";
import { CreateDocumentForm } from "@/components/regwatch/documents/CreateDocumentForm";
import { FolderTreeNav } from "@/components/regwatch/documents/FolderTreeNav";
import { MoveDocumentMenu } from "@/components/regwatch/documents/MoveDocumentMenu";

export const metadata = { title: "Internal documents" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pick(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = raw[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function DocumentsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const folderParam = pick(raw, "folder") ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/regwatch/login?next=/regwatch/documents");

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

  // Resolve which folder we're showing.
  const folderId =
    folderParam && folderParam !== "unfiled" ? folderParam : null;
  const showUnfiled = folderParam === "unfiled";
  const showAll = !folderParam;

  const [org, membership, allDocs, folders, unfiledCount] = await Promise.all([
    getMyOrganization(),
    getMyMembership(),
    listDocuments(), // for totals + the "All" view
    listFolders(),
    countUnfiledDocuments(),
  ]);

  const folderTree = buildFolderTree(folders);
  const canCreate =
    membership?.role === "owner" || membership?.role === "admin";

  // The visible doc list for this view.
  const visibleDocs = showAll
    ? allDocs
    : showUnfiled
      ? allDocs.filter((d) => d.folderId === null)
      : allDocs.filter((d) => d.folderId === folderId);

  // Folder context for the header.
  let activeFolderName: string | null = null;
  let breadcrumb: { id: string; name: string }[] = [];
  if (folderId) {
    const folder = await getFolder(folderId);
    activeFolderName = folder?.name ?? null;
    breadcrumb = (await getFolderBreadcrumb(folderId)).map((f) => ({
      id: f.id,
      name: f.name,
    }));
  }
  const headerLabel = showAll
    ? "All documents"
    : showUnfiled
      ? "Unfiled"
      : (activeFolderName ?? "Folder not found");

  const activeFolderKey = showAll
    ? null
    : showUnfiled
      ? "unfiled"
      : (folderId ?? null);

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            My Feed
          </Link>
          <span className="mx-2">/</span>
          <Link
            href="/regwatch/documents"
            className="hover:text-foreground"
          >
            Internal documents
          </Link>
          {breadcrumb.map((b) => (
            <span key={b.id}>
              <span className="mx-2">/</span>
              <Link
                href={`/regwatch/documents?folder=${b.id}`}
                className="hover:text-foreground"
              >
                {b.name}
              </Link>
            </span>
          ))}
          {folderId && (
            <>
              <span className="mx-2">/</span>
              <span className="text-foreground">{activeFolderName}</span>
            </>
          )}
        </nav>

        <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
              {org?.organization.name ?? "Your organization"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              {headerLabel}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {showAll
                ? "Your SOPs, policies, permits, and standards. Organise them into project folders, link them to regulations + assets, and stay alerted when linked regulations change."
                : showUnfiled
                  ? "Documents not yet assigned to a project folder. Use the Move to… menu on each row to file them."
                  : "Documents inside this project folder. Sub-folders show in the left-hand tree."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted">
              {showAll ? "Total" : "In this view"}
            </p>
            <p className="font-mono text-2xl font-semibold text-foreground">
              {visibleDocs.length}
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Left rail */}
          <FolderTreeNav
            roots={folderTree}
            activeFolderKey={activeFolderKey}
            unfiledCount={unfiledCount}
            canEdit={canCreate}
            totalDocCount={allDocs.length}
          />

          {/* Right pane */}
          <section className="space-y-6">
            {canCreate && (
              <div className="rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
                <header className="mb-4">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    Register a document
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {folderId
                      ? "Created in the current folder. You can move it later from the Move to… menu."
                      : "Created in Unfiled. Drop it into a folder from the Move to… menu, or via the detail page."}
                  </p>
                </header>
                <CreateDocumentForm defaultFolderId={folderId} />
              </div>
            )}

            {visibleDocs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-8 text-center text-sm text-muted">
                No documents in this view.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-card-border bg-background">
                <table className="w-full text-sm">
                  <thead className="border-b border-card-border bg-card-bg/40 text-left text-[10px] uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Kind</th>
                      <th className="px-4 py-3">Owner</th>
                      <th className="px-4 py-3">Regs</th>
                      <th className="px-4 py-3">Assets</th>
                      <th className="px-4 py-3">Updated</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDocs.map((d) => (
                      <tr
                        key={d.id}
                        className="border-b border-card-border last:border-0 hover:bg-card-bg/50"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/regwatch/documents/${d.id}`}
                            className="font-medium text-foreground hover:text-brand-teal"
                          >
                            {d.title}
                          </Link>
                          {d.internalCode && (
                            <span className="ml-2 font-mono text-[10px] text-muted">
                              {d.internalCode}
                            </span>
                          )}
                          {d.version && (
                            <span className="ml-1 text-[10px] text-muted">
                              · {d.version}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">
                          {DOCUMENT_KIND_LABEL[d.docKind]}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">
                          {d.ownerName ?? d.ownerEmail ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span
                            className={`rounded-md px-1.5 py-0.5 font-mono ${
                              d.linkCount > 0
                                ? "bg-brand-teal/15 text-brand-teal"
                                : "bg-card-bg text-muted"
                            }`}
                          >
                            {d.linkCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span
                            className={`rounded-md px-1.5 py-0.5 font-mono ${
                              d.assetLinkCount > 0
                                ? "bg-brand-blue/15 text-brand-blue"
                                : "bg-card-bg text-muted"
                            }`}
                          >
                            {d.assetLinkCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-muted">
                          {formatDistanceToNowStrict(new Date(d.updatedAt), {
                            addSuffix: true,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <MoveDocumentMenu
                            documentId={d.id}
                            currentFolderId={d.folderId}
                            folderRoots={folderTree}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </RegwatchAppShell>
  );
}
