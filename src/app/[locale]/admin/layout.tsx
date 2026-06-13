import { localizedRedirect } from "@/i18n/redirect";
import { canManageContent, getSessionUser } from "@/lib/auth/roles";
import { AdminShell } from "./_components/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) return localizedRedirect("/auth/login?next=/admin");
  if (!canManageContent(user)) return localizedRedirect("/");
  return <AdminShell>{children}</AdminShell>;
}
