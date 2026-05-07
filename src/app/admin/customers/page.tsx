"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Customer = {
  id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

export default function CustomersListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Customers</h1>
        <Button href="/admin/customers/invite" size="sm">Invite Customer</Button>
      </div>
      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : customers.length === 0 ? (
        <p className="text-muted">
          No customers yet. Invite one to get started.
        </p>
      ) : (
        <div className="rounded-xl border border-card-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card-bg">
              <tr className="text-left text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last sign-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-card-bg/50">
                  <td className="px-4 py-3 text-white font-medium">
                    {c.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{c.email}</td>
                  <td className="px-4 py-3 text-muted text-xs">{c.company || "—"}</td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {c.last_sign_in_at
                      ? new Date(c.last_sign_in_at).toLocaleDateString()
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
