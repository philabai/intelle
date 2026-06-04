import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/regwatch/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServiceClient();
  // Light ping: head-count on the globally-readable regulators table.
  const { error } = await supabase
    .from("regulators")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json(
      { status: "degraded", supabase: "error", error: error.message },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: "ok", supabase: "ok" });
}
