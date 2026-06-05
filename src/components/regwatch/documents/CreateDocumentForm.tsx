"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDocument } from "@/lib/regwatch/internal-documents-actions";

const KIND_OPTIONS = [
  { value: "sop", label: "SOP" },
  { value: "policy", label: "Policy" },
  { value: "permit", label: "Permit" },
  { value: "work-instruction", label: "Work instruction" },
  { value: "training-material", label: "Training material" },
  { value: "validation-protocol", label: "Validation protocol" },
  { value: "risk-assessment", label: "Risk assessment" },
  { value: "other", label: "Other" },
];

export function CreateDocumentForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [docKind, setDocKind] = useState("sop");
  const [internalCode, setInternalCode] = useState("");
  const [version, setVersion] = useState("");
  const [ownerRole, setOwnerRole] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createDocument({
        title: title.trim(),
        docKind,
        internalCode: internalCode.trim() || null,
        version: version.trim() || null,
        ownerRole: ownerRole.trim() || null,
      });
      if (!res.ok || !res.id) {
        setError(res.error ?? "Could not create document");
        return;
      }
      setTitle("");
      setInternalCode("");
      setVersion("");
      setOwnerRole("");
      router.push(`/regwatch/documents/${res.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
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
      <label className="flex flex-col gap-1 text-sm">
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
      <label className="flex flex-col gap-1 text-sm">
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
      <label className="flex flex-col gap-1 text-sm">
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
      <label className="flex flex-col gap-1 text-sm">
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
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create document"}
        </button>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </form>
  );
}
