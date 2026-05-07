import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionUser } from "@/lib/auth/roles";

export const runtime = "nodejs";

interface Props {
  params: Promise<{ id: string }>;
}

const BUCKET = "engagement-files";

function isAdminLike(role: string | null) {
  return role === "admin" || role === "content_admin" || role === "researcher";
}

async function ensureAccess(engagementId: string, userId: string, role: string | null) {
  const service = createServiceClient();
  const { data: eng, error } = await service
    .from("engagements")
    .select("id, customer_id")
    .eq("id", engagementId)
    .single();
  if (error || !eng) return { ok: false as const, status: 404 };
  if (isAdminLike(role)) return { ok: true as const, engagement: eng, isAdmin: true };
  if (eng.customer_id === userId) return { ok: true as const, engagement: eng, isAdmin: false };
  return { ok: false as const, status: 403 };
}

export async function GET(_req: Request, { params }: Props) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const access = await ensureAccess(id, user.id, user.role);
  if (!access.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: access.status });
  }

  const service = createServiceClient();
  let q = service
    .from("engagement_documents")
    .select("*")
    .eq("engagement_id", id)
    .order("created_at", { ascending: false });
  if (!access.isAdmin) q = q.eq("is_visible_to_customer", true);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request, { params }: Props) {
  const user = await getSessionUser();
  if (!user || !isAdminLike(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const title = (form.get("title") as string | null) || file.name;
  const description = (form.get("description") as string | null) || null;
  const kind = ((form.get("kind") as string | null) || "deliverable") as
    | "deliverable" | "draft" | "source" | "report" | "other";
  const isVisible = form.get("is_visible_to_customer") !== "false";

  const service = createServiceClient();
  const { data: eng } = await service
    .from("engagements")
    .select("id")
    .eq("id", id)
    .single();
  if (!eng) return NextResponse.json({ error: "Engagement not found" }, { status: 404 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${id}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: doc, error: insertError } = await service
    .from("engagement_documents")
    .insert({
      engagement_id: id,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      kind,
      title,
      description,
      uploaded_by: user.id,
      is_visible_to_customer: isVisible,
    })
    .select()
    .single();

  if (insertError) {
    await service.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(doc, { status: 201 });
}
