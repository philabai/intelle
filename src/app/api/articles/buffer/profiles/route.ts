import { NextResponse } from "next/server";
import { listChannels } from "@/lib/content/buffer";
import { canManageContent, getSessionUser } from "@/lib/auth/roles";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!canManageContent(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.BUFFER_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "BUFFER_ACCESS_TOKEN not set", profiles: [] },
      { status: 503 }
    );
  }

  try {
    const profiles = await listChannels();
    // Build a per-org breakdown for debugging — same data, grouped, plus an
    // explicit indication of which org id is configured (if any).
    const byOrg: Record<string, { name: string | null; channels: typeof profiles }> = {};
    for (const p of profiles) {
      if (!byOrg[p.organizationId]) {
        byOrg[p.organizationId] = { name: p.organizationName, channels: [] };
      }
      byOrg[p.organizationId].channels.push(p);
    }
    return NextResponse.json({
      profiles,
      diagnostics: {
        configured_org_id: process.env.BUFFER_ORGANIZATION_ID || null,
        organizations_seen: Object.entries(byOrg).map(([id, v]) => ({
          id,
          name: v.name,
          channel_count: v.channels.length,
        })),
        total_channels: profiles.length,
      },
    });
  } catch (err) {
    console.error("[buffer/profiles] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Buffer error", profiles: [] },
      { status: 500 }
    );
  }
}
