import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionUser } from "@/lib/auth/roles";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).optional(),
  company: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "content_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://intelle.io";
  const service = createServiceClient();

  const { data, error } = await service.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: {
        full_name: parsed.data.full_name,
        company: parsed.data.company,
      },
      redirectTo: `${siteUrl}/dashboard`,
    }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Set the role to 'customer' on the freshly invited user.
  if (data.user?.id) {
    await service.auth.admin.updateUserById(data.user.id, {
      app_metadata: {
        ...(data.user.app_metadata as Record<string, unknown>),
        role: "customer",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    user_id: data.user?.id,
    email: data.user?.email,
  });
}
