"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDocument,
  uploadDocumentFile,
} from "@/lib/regwatch/internal-documents-actions";

const KIND_OPTIONS = [
  { value: "sop", label: "SOP" },
  { value: "policy", label: "Policy" },
  { value: "permit", label: "Permit" },
  { value: "work-instruction", label: "Work instruction" },
  { value: "training-material", label: "Training material" },
  { value: "validation-protocol", label: "Validation protocol" },
  { value: "risk-assessment", label: "Risk assessment" },
  { value: "internal-standard", label: "Internal standard" },
  { value: "regulation", label: "Regulation" },
  { value: "test-plan", label: "Test plan" },
  { value: "project-document", label: "Project document" },
  { value: "lessons-learnt", label: "Lessons learnt" },
  { value: "design-document", label: "Design document" },
  { value: "drawing", label: "Drawing" },
  { value: "other", label: "Other" },
];

/**
 * One-step "Register a document". The file picker lives next to the metadata
 * fields and the form's single submit handler chains createDocument →
 * uploadDocumentFile so admins don't have to land on the detail page just
 * to drop their file in.
 *
 * File is optional — a doc can be registered metadata-first and the file
 * added later from the detail page if that's the workflow.
 */
export function CreateDocumentForm({
  defaultFolderId,
}: {
  defaultFolderId?: string | null;
} = {}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [docKind, setDocKind] = useState("sop");
  const [internalCode, setInternalCode] = useState("");
  const [version, setVersion] = useState("");
  const [ownerRole, setOwnerRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const createRes = await createDocument({
        title: title.trim(),
        docKind,
        internalCode: internalCode.trim() || null,
        version: version.trim() || null,
        ownerRole: ownerRole.trim() || null,
        folderId: defaultFolderId ?? null,
      });
      if (!createRes.ok || !createRes.id) {
        setError(createRes.error ?? "Could not create document");
        return;
      }

      // Optional: chain the file upload if one was picked.
      if (file) {
        const fd = new FormData();
        fd.set("documentId", createRes.id);
        fd.set("file", file);
        const upRes = await uploadDocumentFile(fd);
        if (!upRes.ok) {
          // Don't lose the document — they can retry upload from the detail
          // page. Surface a friendly warning + still navigate.
          setError(
            `Document created, but the file upload failed: ${upRes.error ?? "unknown error"}. You can retry from the document detail page.`,
          );
          router.push(`/regwatch/documents/${createRes.id}`);
          return;
        }
      }

      // Reset + navigate.
      setTitle("");
      setInternalCode("");
      setVersion("");
      setOwnerRole("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.push(`/regwatch/documents/${createRes.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <label
        className="flex flex-col gap-1 text-sm sm:col-span-2"
        title="Display name shown on the document list and detail page. Required."
      >
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          Title
        </span>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Lock-out/Tag-out SOP"
          className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
      </label>
      <label
        className="flex flex-col gap-1 text-sm"
        title="What kind of document this is. Drives icon + filter chips."
      >
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          Kind
        </span>
        <select
          value={docKind}
          onChange={(e) => setDocKind(e.target.value)}
          className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground focus:border-brand-blue focus:outline-none"
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label
        className="flex flex-col gap-1 text-sm"
        title="Your organisation's reference number for this document — e.g. SOP-EHS-014."
      >
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          Internal code
        </span>
        <input
          value={internalCode}
          onChange={(e) => setInternalCode(e.target.value)}
          placeholder="SOP-EHS-014"
          className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
      </label>
      <label
        className="flex flex-col gap-1 text-sm"
        title="Current version number / revision identifier."
      >
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          Version
        </span>
        <input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="v1.0"
          className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
      </label>
      <label
        className="flex flex-col gap-1 text-sm"
        title="Role that owns this document (e.g. EHS Manager). Used as the contact + future role-based reviewer assignment."
      >
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          Owner role
        </span>
        <input
          value={ownerRole}
          onChange={(e) => setOwnerRole(e.target.value)}
          placeholder="EHS Manager"
          className="rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-brand-blue focus:outline-none"
        />
      </label>

      <div className="sm:col-span-2">
        <span
          className="text-xs font-medium uppercase tracking-wider text-muted"
          title="Optional: attach the actual file now. You can also skip and upload from the detail page later."
        >
          File (optional)
        </span>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <label
            className="cursor-pointer rounded-md border border-card-border bg-card-bg px-3 py-1.5 text-xs text-foreground hover:border-brand-blue"
            title="Pick a file from your computer — PDF / DOCX / TXT or similar. Max 50MB."
          >
            {file ? "Replace file" : "Choose file"}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && (
            <span className="text-[11px] text-foreground/85">
              {file.name}{" "}
              <span className="text-muted">
                · {(file.size / 1024).toFixed(1)} KB
              </span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="ml-2 text-muted hover:text-red-300"
                title="Remove the picked file (the document metadata will still be saved)"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            file
              ? "Create the document metadata and upload the picked file in one step"
              : "Create the document metadata. You can attach a file later from the detail page."
          }
        >
          {pending
            ? file
              ? "Creating & uploading…"
              : "Creating…"
            : file
              ? "Create & upload"
              : "Create document"}
        </button>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </form>
  );
}
