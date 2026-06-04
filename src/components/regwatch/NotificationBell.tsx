import { getMyUnseenCount, listMyTopUnseen } from "@/lib/regwatch/alerts";
import { NotificationBellClient } from "./NotificationBellClient";

/**
 * Server component — wraps the client bell with pre-fetched count + top
 * unseen items. The drawer renders instantly when opened, no client fetch.
 * Trade-off: the count is fresh-as-of-page-render, not realtime. Phase 1.x
 * can add SWR revalidation if users ask for it.
 */
export async function NotificationBell({ authed }: { authed: boolean }) {
  if (!authed) return null;
  const [count, items] = await Promise.all([
    getMyUnseenCount(),
    listMyTopUnseen(10),
  ]);
  return <NotificationBellClient initialCount={count} items={items} />;
}
