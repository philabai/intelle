import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionUser } from "@/lib/auth/roles";
import { serviceLabel } from "@/lib/services/lookup";
import type { Engagement, EngagementDocument } from "@/lib/types";
import { DocumentList } from "../_components/DocumentList";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ engagementId: string }>;
}

export default async function EngagementDetail({ params }: Props) {
  const user = await getSessionUser();
  const { engagementId } = await params;

  const service = createServiceClient();
  const { data: eng } = await service
    .from("engagements")
    .select("*")
    .eq("id", engagementId)
    .single();
  if (!eng || eng.customer_id !== user!.id) notFound();

  const { data: docs } = await service
    .from("engagement_documents")
    .select("*")
    .eq("engagement_id", engagementId)
    .eq("is_visible_to_customer", true)
    .order("created_at", { ascending: false });

  const engagement = eng as Engagement;
  const documents = (docs || []) as EngagementDocument[];

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm text-muted hover:text-white mb-4 inline-block"
      >
        ← All engagements
      </Link>

      <div className="mb-8">
        <p className="text-xs uppercase tracking-wide text-muted/70 mb-1">
          {engagement.service_type === "research" ? "Research" : "Implementation"} ·{" "}
          {serviceLabel(engagement.service_type, engagement.service_id)}
        </p>
        <h1 className="text-2xl font-bold text-white">{engagement.title}</h1>
        {engagement.notes && (
          <p className="text-sm text-muted mt-2 max-w-3xl whitespace-pre-line">
            {engagement.notes}
          </p>
        )}
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          Documents
        </h2>
        <DocumentList engagementId={engagement.id} documents={documents} canManage={false} />
      </section>
    </div>
  );
}
