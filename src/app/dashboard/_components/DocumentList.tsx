"use client";

import { useState } from "react";
import type { EngagementDocument } from "@/lib/types";

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentList({
  engagementId,
  documents,
  canManage,
  onChange,
}: {
  engagementId: string;
  documents: EngagementDocument[];
  canManage: boolean;
  onChange?: () => void;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDownload(docId: string) {
    setDownloading(docId);
    try {
      const res = await fetch(
        `/api/engagements/${engagementId}/documents/${docId}`
      );
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
      else alert(data.error || "Download failed");
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document?")) return;
    setDeleting(docId);
    const res = await fetch(
      `/api/engagements/${engagementId}/documents/${docId}`,
      { method: "DELETE" }
    );
    setDeleting(null);
    if (res.ok && onChange) onChange();
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-card-border bg-card-bg p-6 text-center">
        <p className="text-sm text-muted">No documents yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-card-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-card-bg">
          <tr className="text-left text-muted">
            <th className="px-4 py-3 font-medium">File</th>
            <th className="px-4 py-3 font-medium">Kind</th>
            {canManage && <th className="px-4 py-3 font-medium">Visible</th>}
            <th className="px-4 py-3 font-medium">Size</th>
            <th className="px-4 py-3 font-medium">Uploaded</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {documents.map((d) => (
            <tr key={d.id} className="hover:bg-card-bg/50">
              <td className="px-4 py-3">
                <div className="text-white font-medium">{d.title || d.file_name}</div>
                {d.description && (
                  <div className="text-xs text-muted/70 mt-0.5">{d.description}</div>
                )}
              </td>
              <td className="px-4 py-3 text-muted text-xs">{d.kind}</td>
              {canManage && (
                <td className="px-4 py-3 text-xs">
                  {d.is_visible_to_customer ? (
                    <span className="text-brand-teal">visible</span>
                  ) : (
                    <span className="text-yellow-400">hidden</span>
                  )}
                </td>
              )}
              <td className="px-4 py-3 text-muted text-xs">
                {formatBytes(d.file_size)}
              </td>
              <td className="px-4 py-3 text-muted text-xs">
                {new Date(d.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(d.id)}
                    disabled={downloading === d.id}
                    className="text-brand-blue hover:text-brand-blue/80 text-sm cursor-pointer disabled:opacity-50"
                  >
                    {downloading === d.id ? "..." : "Download"}
                  </button>
                  {canManage && (
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deleting === d.id}
                      className="text-red-400 hover:text-red-300 text-sm cursor-pointer disabled:opacity-50"
                    >
                      {deleting === d.id ? "..." : "Delete"}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
