"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const inputStyles =
  "w-full rounded-lg border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";

export default function InviteCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", full_name: "", company: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch("/api/customers/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error || "Invite failed");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/admin/customers"), 1200);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-white mb-2">Invite customer</h1>
      <p className="text-sm text-muted mb-8">
        Sends a magic-link email. The customer sets a password on first login and
        lands on their dashboard.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className={inputStyles}
            placeholder="customer@company.com"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Full name
            </label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className={inputStyles}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Company
            </label>
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className={inputStyles}
            />
          </div>
        </div>
        {error && (
          <p className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </p>
        )}
        {done && (
          <p className="p-3 rounded-lg bg-brand-teal/10 border border-brand-teal/30 text-brand-teal text-sm">
            Invite sent.
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send invite"}
          </Button>
          <Button variant="outline" href="/admin/customers">Cancel</Button>
        </div>
      </form>
    </div>
  );
}
