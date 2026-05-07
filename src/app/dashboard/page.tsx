import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionUser } from "@/lib/auth/roles";
import { serviceLabel } from "@/lib/services/lookup";
import type { Engagement } from "@/lib/types";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  active: "bg-brand-teal/10 text-brand-teal",
  paused: "bg-yellow-500/10 text-yellow-400",
  completed: "bg-muted/10 text-muted",
  cancelled: "bg-red-500/10 text-red-400",
};

export default async function DashboardHome() {
  const user = await getSessionUser();
  const service = createServiceClient();
  const { data } = await service
    .from("engagements")
    .select("*")
    .eq("customer_id", user!.id)
    .order("created_at", { ascending: false });
  const engagements = (data || []) as Engagement[];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Your engagements</h1>
        <p className="text-sm text-muted mt-1">
          The services you&apos;re subscribed to and their deliverables.
        </p>
      </div>

      {engagements.length === 0 ? (
        <div className="rounded-xl border border-card-border bg-card-bg p-8 text-center">
          <p className="text-muted">
            No engagements yet. Once we&apos;ve scoped a project together, it will
            appear here with all your deliverables.
          </p>
          <p className="text-xs text-muted/60 mt-2">
            Need help? Email{" "}
            <a className="text-brand-teal hover:underline" href="mailto:hello@intelle.io">
              hello@intelle.io
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {engagements.map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/${e.id}`}
              className="rounded-xl border border-card-border bg-card-bg p-5 hover:border-brand-blue/50 transition-colors block"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted/70 mb-1">
                    {e.service_type === "research" ? "Research" : "Implementation"}
                  </p>
                  <h2 className="text-base font-semibold text-white leading-tight">
                    {e.title}
                  </h2>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    statusColors[e.status] ?? statusColors.active
                  }`}
                >
                  {e.status}
                </span>
              </div>
              <p className="text-sm text-muted">
                {serviceLabel(e.service_type, e.service_id)}
              </p>
              {e.started_at && (
                <p className="text-xs text-muted/60 mt-3">
                  Started {new Date(e.started_at).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
