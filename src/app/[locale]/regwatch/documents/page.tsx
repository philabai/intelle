import { Link } from "@/i18n/navigation";
import { localizedRedirect } from "@/i18n/redirect";
import { createClient } from "@/lib/regwatch/supabase/server";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { getMyMembership } from "@/lib/regwatch/members";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import {
  listDocuments,
  DOCUMENT_KIND_LABEL,
} from "@/lib/regwatch/internal-documents";
import {
  listFolders,
  buildFolderTree,
  countUnfiledDocuments,
  getFolderBreadcrumb,
  getFolder,
} from "@/lib/regwatch/document-folders";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";
import { FolderTreeNav } from "@/components/regwatch/documents/FolderTreeNav";
import { DocCardGrid } from "@/components/regwatch/documents/gallery/DocCardGrid";
import { GalleryControls } from "@/components/regwatch/documents/gallery/GalleryControls";
import { NewDocumentButton } from "@/components/regwatch/documents/gallery/NewDocumentButton";

export const metadata = { title: "Company documents" };
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
  const ownerParam = (pick(raw, "owner") ?? "anyone") as "anyone" | "me";
  const sortParam = (pick(raw, "sort") ?? "updated") as
    | "updated"
    | "title"
    | "kind";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localizedRedirect("/regwatch/login?next=/regwatch/documents");

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

  const folderId =
    folderParam && folderParam !== "unfiled" ? folderParam : null;
  const showUnfiled = folderParam === "unfiled";
  const showAll = !folderParam;

  const [org, membership, allDocs, folders, unfiledCount] = await Promise.all([
    getMyOrganization(),
    getMyMembership(),
    listDocuments(),
    listFolders(),
    countUnfiledDocuments(),
  ]);

  const folderTree = buildFolderTree(folders);
  const canCreate =
    membership?.role === "owner" || membership?.role === "admin";

  // Filter chain — folder → owner.
  let visibleDocs = showAll
    ? allDocs
    : showUnfiled
      ? allDocs.filter((d) => d.folderId === null)
      : allDocs.filter((d) => d.folderId === folderId);
  if (ownerParam === "me") {
    visibleDocs = visibleDocs.filter((d) => d.ownerUserId === user.id);
  }

  // Sort.
  visibleDocs = [...visibleDocs].sort((a, b) => {
    if (sortParam === "title") return a.title.localeCompare(b.title);
    if (sortParam === "kind") {
      const kindCompare = DOCUMENT_KIND_LABEL[a.docKind].localeCompare(
        DOCUMENT_KIND_LABEL[b.docKind],
      );
      if (kindCompare !== 0) return kindCompare;
      return a.title.localeCompare(b.title);
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

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
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            My Feed
          </Link>
          <span className="mx-2">/</span>
          <Link
            href="/regwatch/documents"
            className="hover:text-foreground"
          >
            Company documents
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

        <header className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
              {org?.organization.name ?? "Your organization"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              {headerLabel}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {showAll
                ? "Your SOPs, policies, permits, and standards. Author them in-app, organise them into project folders, link them to regulations + assets, and stay alerted when linked regulations change."
                : showUnfiled
                  ? "Documents not yet assigned to a project folder. Use the document detail page to move them."
                  : "Documents inside this project folder. Sub-folders show in the left-hand tree."}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {canCreate && <NewDocumentButton defaultFolderId={folderId} />}
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted">
                {showAll ? "Total" : "In view"}
              </p>
              <p className="font-mono text-xl font-semibold text-foreground">
                {visibleDocs.length}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <FolderTreeNav
            roots={folderTree}
            activeFolderKey={activeFolderKey}
            unfiledCount={unfiledCount}
            canEdit={canCreate}
            totalDocCount={allDocs.length}
          />

          <section className="min-w-0 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <GalleryControls ownerFilter={ownerParam} sort={sortParam} />
            </div>
            <DocCardGrid docs={visibleDocs} />
          </section>
        </div>
      </div>
    </RegwatchAppShell>
  );
}
