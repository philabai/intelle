import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { createClient } from "@/lib/regwatch/supabase/server";
import { checkFeatureGate } from "@/lib/regwatch/tier";
import { getMyMembership } from "@/lib/regwatch/members";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { listDocuments, DOCUMENT_KIND_LABEL } from "@/lib/regwatch/internal-documents";
import { RegwatchAppShell } from "@/components/regwatch/AppShell";
import { PaywallScreen } from "@/components/regwatch/PaywallScreen";
import { CreateDocumentForm } from "@/components/regwatch/documents/CreateDocumentForm";

export const metadata = { title: "Internal documents" };
export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
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

  const [org, membership, documents] = await Promise.all([
    getMyOrganization(),
    getMyMembership(),
    listDocuments(),
  ]);
  const canCreate =
    membership?.role === "owner" || membership?.role === "admin";

  return (
    <RegwatchAppShell authed>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <nav className="text-xs text-muted">
          <Link href="/regwatch/feed" className="hover:text-foreground">
            My Feed
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Internal documents</span>
        </nav>

        <header className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-teal">
              {org?.organization.name ?? "Your organization"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Internal documents
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Your SOPs, policies, permits, and standards. Link them to
              regulations from the corpus; when a linked regulation changes,
              the document&apos;s owner gets notified.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted">Total</p>
            <p className="font-mono text-2xl font-semibold text-foreground">
              {documents.length}
            </p>
          </div>
        </header>

        {canCreate && (
          <section className="mb-8 rounded-xl border border-card-border bg-card-bg/40 p-5 sm:p-6">
            <header className="mb-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Register a document
              </h2>
              <p className="mt-1 text-xs text-muted">
                Create the record first, then upload the file and link it to
                regulations from the detail page.
              </p>
            </header>
            <CreateDocumentForm />
          </section>
        )}

        {documents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-8 text-center text-sm text-muted">
            No documents yet. Register your first SOP above.
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
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RegwatchAppShell>
  );
}
