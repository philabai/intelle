"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { allServiceOptions } from "@/lib/services/lookup";
import type { EngagementServiceType } from "@/lib/types";

const inputStyles =
  "w-full rounded-lg border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";

type Customer = {
  id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
};

export default function NewEngagementPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({
    customer_id: "",
    service_type: "research" as EngagementServiceType,
    service_id: "",
    title: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data));
  }, []);

  const services = allServiceOptions().filter(
    (s) => s.service_type === form.service_type
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/engagements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create");
      setSaving(false);
      return;
    }
    router.push(`/admin/engagements/${data.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">New engagement</h1>
      <p className="text-sm text-muted mb-8">
        Assign a customer to one of the 7 research or 4 implementation services.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Customer
          </label>
          <select
            value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            required
            className={inputStyles}
          >
            <option value="">— select —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || c.email}
                {c.company ? ` · ${c.company}` : ""}
              </option>
            ))}
          </select>
          {customers.length === 0 && (
            <p className="text-xs text-muted/60 mt-1">
              No customers yet —{" "}
              <a className="text-brand-teal hover:underline" href="/admin/customers/invite">
                invite one
              </a>{" "}
              first.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Service type
            </label>
            <select
              value={form.service_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  service_type: e.target.value as EngagementServiceType,
                  service_id: "",
                })
              }
              className={inputStyles}
            >
              <option value="research">Research</option>
              <option value="engineering">Implementation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Service
            </label>
            <select
              value={form.service_id}
              onChange={(e) => setForm({ ...form, service_id: e.target.value })}
              required
              className={inputStyles}
            >
              <option value="">— select —</option>
              {services.map((s) => (
                <option key={s.service_id} value={s.service_id}>
                  {s.shortTitle}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className={inputStyles}
            placeholder="e.g. GCC hydrogen offtake landscape, Q2 2026"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Notes (visible to customer)
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={4}
            className={inputStyles}
            placeholder="Scope summary, milestones, or anything the customer should see at the top of their engagement page."
          />
        </div>

        {error && (
          <p className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create engagement"}
          </Button>
          <Button variant="outline" href="/admin/engagements">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
