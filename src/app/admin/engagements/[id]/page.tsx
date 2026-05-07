"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DocumentList } from "@/app/dashboard/_components/DocumentList";
import { serviceLabel } from "@/lib/services/lookup";
import type {
  Engagement,
  EngagementDocument,
  EngagementServiceType,
} from "@/lib/types";

const inputStyles =
  "w-full rounded-lg border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";

export default function ManageEngagementPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [eng, setEng] = useState<Engagement | null>(null);
  const [docs, setDocs] = useState<EngagementDocument[]>([]);
  const [loading, setLoading] = useState(true);

  // upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadKind, setUploadKind] = useState("deliverable");
  const [isVisible, setIsVisible] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // status edit
  const [savingStatus, setSavingStatus] = useState(false);

  const refresh = useCallback(async () => {
    const [e, d] = await Promise.all([
      fetch(`/api/engagements/${id}`).then((r) => r.json()),
      fetch(`/api/engagements/${id}/documents`).then((r) => r.json()),
    ]);
    setEng(e);
    setDocs(d);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    fd.append("file", file);
    if (uploadTitle) fd.append("title", uploadTitle);
    fd.append("kind", uploadKind);
    fd.append("is_visible_to_customer", String(isVisible));

    const res = await fetch(`/api/engagements/${id}/documents`, {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json();
      setUploadError(data.error || "Upload failed");
      return;
    }
    setFile(null);
    setUploadTitle("");
    refresh();
  }

  async function handleStatusChange(newStatus: string) {
    if (!eng) return;
    setSavingStatus(true);
    await fetch(`/api/engagements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      }),
    });
    setSavingStatus(false);
    refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this engagement and all its documents?")) return;
    await fetch(`/api/engagements/${id}`, { method: "DELETE" });
    router.push("/admin/engagements");
  }

  if (loading || !eng) return <p className="text-muted">Loading...</p>;

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted/70 mb-1">
          {eng.service_type === "research" ? "Research" : "Implementation"} ·{" "}
          {serviceLabel(eng.service_type as EngagementServiceType, eng.service_id)}
        </p>
        <h1 className="text-2xl font-bold text-white">{eng.title}</h1>
      </div>

      <section className="rounded-xl border border-card-border bg-card-bg p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-4">
          Status
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={eng.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={savingStatus}
            className={inputStyles + " max-w-xs"}
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={handleDelete}
            className="text-sm text-red-400 hover:text-red-300 cursor-pointer ml-auto"
          >
            Delete engagement
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          Upload document
        </h2>
        <form
          onSubmit={handleUpload}
          className="rounded-xl border border-card-border bg-card-bg p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
              className="text-sm text-muted file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-card-border file:bg-background file:text-foreground file:cursor-pointer"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Title (optional)
              </label>
              <input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className={inputStyles}
                placeholder="Leave blank to use filename"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Kind
              </label>
              <select
                value={uploadKind}
                onChange={(e) => setUploadKind(e.target.value)}
                className={inputStyles}
              >
                <option value="deliverable">Deliverable</option>
                <option value="draft">Draft</option>
                <option value="report">Report</option>
                <option value="source">Source</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
            />
            Visible to customer
          </label>
          {uploadError && (
            <p className="text-red-400 text-sm">{uploadError}</p>
          )}
          <Button type="submit" disabled={!file || uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          Documents
        </h2>
        <DocumentList
          engagementId={id}
          documents={docs}
          canManage
          onChange={refresh}
        />
      </section>
    </div>
  );
}
