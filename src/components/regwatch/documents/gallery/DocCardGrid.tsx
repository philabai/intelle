import { useTranslations } from "next-intl";
import type { InternalDocumentListItem } from "@/lib/regwatch/internal-documents";
import { DocCard } from "./DocCard";

interface Props {
  docs: InternalDocumentListItem[];
}

/**
 * Responsive grid wrapper. Cards are async server components so we render
 * them as a list of awaited renders — Next.js handles streaming.
 */
export function DocCardGrid({ docs }: Props) {
  const t = useTranslations("regwatch.documents");
  if (docs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-card-border bg-card-bg/30 p-10 text-center text-sm text-muted">
        {t("noDocumentsInView")}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {docs.map((d) => (
        <DocCard key={d.id} doc={d} />
      ))}
    </div>
  );
}
