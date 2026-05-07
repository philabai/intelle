import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionUser } from "@/lib/auth/roles";

export const runtime = "nodejs";

interface Props {
  params: Promise<{ id: string; docId: string }>;
}

const BUCKET = "engagement-files";

function isAdminLike(role: string | null) {
  return role === "admin" || role === "content_admin" || role === "researcher";
}

/** GET — returns a short-lived signed URL for download. */
export async function GET(_req: Request, { params }: Props) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, docId } = await params;

  const service = createServiceClient();
  const { data: doc, error } = await service
    .from("engagement_documents")
    .select("*, engagements!inner(customer_id)")
    .eq("id", docId)
    .eq("engagement_id", id)
    .single();
  if (error || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const eng = doc.engagements as { customer_id: string };
  const isAdmin = isAdminLike(user.role);
  if (!isAdmin) {
    if (eng.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!doc.is_visible_to_customer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: signed, error: signError } = await service.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, 60 * 5, { download: doc.file_name });
  if (signError || !signed) {
    return NextResponse.json({ error: signError?.message || "Sign failed" }, { status: 500 });
  }
  return NextResponse.json({ url: signed.signedUrl, file_name: doc.file_name });
}

export async function DELETE(_req: Request, { params }: Props) {
  const user = await getSessionUser();
  if (!user || !isAdminLike(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id, docId } = await params;
  const service = createServiceClient();
  const { data: doc } = await service
    .from("engagement_documents")
    .select("file_path")
    .eq("id", docId)
    .eq("engagement_id", id)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await service.storage.from(BUCKET).remove([doc.file_path]);
  const { error } = await service
    .from("engagement_documents")
    .delete()
    .eq("id", docId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
