import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionUser } from "@/lib/auth/roles";

export const runtime = "nodejs";

function isAdminLike(role: string | null) {
  return role === "admin" || role === "content_admin" || role === "researcher";
}

/** GET — list users with role 'customer'. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAdminLike(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.listUsers({ perPage: 200 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const customers = data.users
    .filter((u) => {
      const role = (u.app_metadata as { role?: string } | undefined)?.role;
      return role === "customer";
    })
    .map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      full_name:
        (u.user_metadata as { full_name?: string } | undefined)?.full_name ?? null,
      company:
        (u.user_metadata as { company?: string } | undefined)?.company ?? null,
    }));
  return NextResponse.json(customers);
}
