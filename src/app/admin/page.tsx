import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [
    { count: totalArticles },
    { count: publishedArticles },
    { count: draftArticles },
    { count: totalContacts },
  ] = await Promise.all([
    supabase.from("articles").select("*", { count: "exact", head: true }),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("contact_submissions").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Total Articles", value: totalArticles || 0, color: "text-brand-blue" },
    { label: "Published", value: publishedArticles || 0, color: "text-brand-teal" },
    { label: "Drafts", value: draftArticles || 0, color: "text-yellow-400" },
    { label: "Contact Submissions", value: totalContacts || 0, color: "text-brand-violet" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <Button href="/admin/articles/new" size="sm">New Article</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} hover={false} className="p-6">
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-muted mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
