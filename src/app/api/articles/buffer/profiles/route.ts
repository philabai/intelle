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
    const { profiles, debug } = await listChannels();
    return NextResponse.json({
      profiles,
      diagnostics: debug,
    });
  } catch (err) {
    console.error("[buffer/profiles] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Buffer error", profiles: [] },
      { status: 500 }
    );
  }
}
