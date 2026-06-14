"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { markAllNotificationsSeen } from "@/lib/regwatch/alerts-actions";

interface Props {
  totalUnseen: number;
}

/**
 * Surfaces when the Feed crosses 50 unseen items. Two actions only —
 * "Mark all seen" (clears the bell badge in one shot) and a refresh trigger
 * for users who just configured something and want to wait out the next
 * matcher tick. Group-by-{regulator,topic,jurisdiction} can come later when
 * the matcher emits enough volume to make grouping a clarity win.
 */
export function BulkTriageBar({ totalUnseen }: Props) {
  const t = useTranslations("regwatch.monitor");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [refreshing, startRefresh] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onMarkAll() {
    if (!confirm(t("bulkMarkAllConfirm", { count: totalUnseen }))) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await markAllNotificationsSeen();
      if (!res.ok) {
        setMessage(res.error ?? t("bulkMarkAllError"));
      } else {
        router.refresh();
      }
    });
  }

  if (totalUnseen <= 50) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-400/30 bg-amber-400/5 px-4 py-3 text-xs sm:px-6">
      <div className="text-amber-300">
        <span className="font-medium">{t("bulkHighVolumeLabel")}</span>{" "}
        {t("bulkHighVolumeBody", { count: totalUnseen })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onMarkAll}
          disabled={pending}
          className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-amber-300 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? t("bulkMarking") : t("bulkMarkAll", { count: totalUnseen })}
        </button>
        <button
          type="button"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={refreshing}
          className="rounded-md border border-card-border bg-card-bg px-3 py-1 text-muted hover:text-foreground disabled:opacity-60"
        >
          {refreshing ? t("bulkRefreshing") : t("bulkRefresh")}
        </button>
      </div>
      {message && (
        <p className="basis-full text-red-400">{message}</p>
      )}
    </div>
  );
}
