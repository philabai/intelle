import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/regwatch/supabase/server";
import { getAsset, getHierarchyConfig } from "@/lib/regwatch/assets";
import { getMyOrganization } from "@/lib/regwatch/footprint";
import { listObligations } from "@/lib/regwatch/obligations";

export const runtime = "nodejs";

/**
 * Compliance obligations for a single asset, for the asset-tree slider drawer.
 * Returns the asset header (name / code / level label) plus its obligations so
 * the user can review compliance without leaving the hierarchy page.
 */
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET(req: NextRequest) {
  const assetId = req.nextUrl.searchParams.get("assetId");
  if (!assetId) return json({ error: "Invalid request" }, 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const asset = await getAsset(assetId);
  if (!asset) return json({ error: "Not found" }, 404);

  const [org, obligations] = await Promise.all([
    getMyOrganization(),
    listObligations({ assetId }, 100),
  ]);
  const config = await getHierarchyConfig(org?.organization.id ?? "");
  const levelLabel =
    (config[`level${asset.level}Label` as keyof typeof config] as
      | string
      | undefined) ?? `L${asset.level}`;

  return json({
    asset: {
      id: asset.id,
      name: asset.name,
      code: asset.code,
      levelLabel,
    },
    obligations: obligations.map((o) => ({
      id: o.id,
      regulationCitation: o.regulationCitation,
      regulationTitle: o.regulationTitle,
      clauseAnchor: o.clauseAnchor,
      severity: o.severity,
      complianceStatus: o.complianceStatus,
      reviewStatus: o.reviewStatus,
      assignedReviewerName: o.assignedReviewerName,
      reviewDueAt: o.reviewDueAt,
    })),
  });
}
