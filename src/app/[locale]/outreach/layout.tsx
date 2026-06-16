import { localizedRedirect } from "@/i18n/redirect";
import { canManageContent, getSessionUser } from "@/lib/auth/roles";
import { OutreachShell } from "./_components/OutreachShell";

/** Admin-only marketing-automation workspace. Same deny-by-default gate as
 * /admin: a platform role in {admin, content_admin} is required. */
export default async function OutreachLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) return localizedRedirect("/auth/login?next=/outreach");
  if (!canManageContent(user)) return localizedRedirect("/");
  return <OutreachShell>{children}</OutreachShell>;
}
