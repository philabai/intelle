import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionUser } from "@/lib/auth/roles";

export const runtime = "nodejs";

const createSchema = z.object({
  customer_id: z.string().uuid(),
  service_id: z.string().min(1),
  service_type: z.enum(["research", "engineering"]),
  title: z.string().min(1),
  status: z.enum(["active", "paused", "completed", "cancelled"]).default("active"),
  notes: z.string().optional(),
});

function isAdminLike(role: string | null) {
  return role === "admin" || role === "content_admin" || role === "researcher";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const query = service.from("engagements").select("*").order("created_at", { ascending: false });
  const { data, error } = isAdminLike(user.role)
    ? await query
    : await query.eq("customer_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !isAdminLike(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const service = createServiceClient();
  const { data, error } = await service
    .from("engagements")
    .insert(parsed.data)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
