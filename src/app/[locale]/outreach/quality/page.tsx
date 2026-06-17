import { loadGenerationConfig } from "@/lib/outreach/generation-config";
import { QualityConfigEditor } from "@/components/outreach/QualityConfigEditor";

export const metadata = { title: "Quality & Prompts — Outreach" };

export default async function OutreachQualityPage() {
  const config = await loadGenerationConfig();
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-white">Quality &amp; Prompts</h1>
      <p className="mt-1 text-sm text-muted">
        Control how drafts are generated and scored. The <span className="text-white">pass bar</span> is the
        confidence a draft must reach; the engine revises a draft up to the revision budget trying to clear
        it. Toggle quality characteristics to inject extra requirements, and edit the underlying prompts
        directly. Changes apply to the next generation.
      </p>
      <QualityConfigEditor config={config} />
    </div>
  );
}
