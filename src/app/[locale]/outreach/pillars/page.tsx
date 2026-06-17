import { getWeeklyPillarStatus } from "@/lib/outreach/weekly-status";
import { PillarsManager } from "@/components/outreach/PillarsManager";

export const metadata = { title: "Content Pillars — Outreach" };

export default async function OutreachPillarsPage() {
  const { pillars } = await getWeeklyPillarStatus();
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-white">Content Pillars</h1>
      <p className="mt-1 text-sm text-muted">
        Set each pillar&apos;s weekly post target and voice. These targets drive the &quot;remaining this
        week&quot; tracker on the Generate page. Manage a pillar&apos;s seeds from the Seeds link.
      </p>
      <PillarsManager pillars={pillars} />
    </div>
  );
}
