"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { serviceLabel } from "@/lib/services/lookup";
import type { Engagement, EngagementServiceType } from "@/lib/types";

const statusColors: Record<string, string> = {
  active: "bg-brand-teal/10 text-brand-teal",
  paused: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-muted/10 text-muted",
  cancelled: "bg-red-500/10 text-red-400",
};

type Customer = { id: string; email: string | null; full_name: string | null };

export default function EngagementsListPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/engagements").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ]).then(([engs, custs]) => {
      setEngagements(engs);
      const map: Record<string, Customer> = {};
      for (const c of custs as Customer[]) map[c.id] = c;
      setCustomers(map);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Engagements</h1>
        <Button href="/admin/engagements/new" size="sm">New Engagement</Button>
      </div>

      {loading ? (
        <p className="text-muted">Loading...</p>
      ) : engagements.length === 0 ? (
        <p className="text-muted">No engagements yet.</p>
      ) : (
        <div className="rounded-xl border border-card-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card-bg">
              <tr className="text-left text-muted">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {engagements.map((e) => {
                const c = customers[e.customer_id];
                return (
                  <tr key={e.id} className="hover:bg-card-bg/50">
                    <td className="px-4 py-3 text-white font-medium">{e.title}</td>
                    <td className="px-4 py-3 text-muted">
                      {c?.full_name || c?.email || e.customer_id.slice(0, 8) + "…"}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {serviceLabel(e.service_type as EngagementServiceType, e.service_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          statusColors[e.status] ?? statusColors.active
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">
                      {e.started_at ? new Date(e.started_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/engagements/${e.id}`}
                        className="text-brand-blue hover:text-brand-blue/80 text-sm"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
