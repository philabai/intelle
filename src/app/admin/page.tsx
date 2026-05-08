import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [
    { count: totalArticles },
    { count: publishedArticles },
    { count: scheduledArticles },
    { count: draftArticles },
    { count: totalContacts },
  ] = await Promise.all([
    supabase.from("articles").select("*", { count: "exact", head: true }),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("contact_submissions").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Total Articles", value: totalArticles || 0, color: "text-brand-blue" },
    { label: "Published", value: publishedArticles || 0, color: "text-brand-teal" },
    { label: "Scheduled", value: scheduledArticles || 0, color: "text-brand-violet" },
    { label: "Drafts", value: draftArticles || 0, color: "text-yellow-400" },
    { label: "Contact Submissions", value: totalContacts || 0, color: "text-muted" },
  ];

  const quickActions = [
    {
      href: "/admin/articles/generate",
      title: "Generate Article (AI)",
      description: "Claude Opus 4.7 writes a 3,000–4,000 word article + LinkedIn + X variants from a topic and pillar.",
      accent: "border-brand-blue/40 hover:border-brand-blue",
      badge: "AI",
    },
    {
      href: "/admin/articles/new",
      title: "New Article (manual)",
      description: "Write or paste an article by hand.",
      accent: "border-card-border hover:border-brand-teal/50",
    },
    {
      href: "/admin/engagements/new",
      title: "New Engagement",
      description: "Assign a customer to one of the 7 research / 4 implementation services.",
      accent: "border-card-border hover:border-brand-teal/50",
    },
    {
      href: "/admin/customers/invite",
      title: "Invite Customer",
      description: "Send a magic-link invite. New customer lands on their dashboard after sign-in.",
      accent: "border-card-border hover:border-brand-teal/50",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <Button href="/admin/articles/generate" size="sm">Generate Article (AI)</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {stats.map((stat) => (
          <Card key={stat.label} hover={false} className="p-5">
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
        Quick actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`block rounded-xl border ${action.accent} bg-card-bg p-5 transition-colors`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-white">{action.title}</h3>
              {action.badge && (
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue uppercase">
                  {action.badge}
                </span>
              )}
            </div>
            <p className="text-sm text-muted mt-1 leading-relaxed">{action.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
