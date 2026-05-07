import { redirect } from "next/navigation";
import { canManageContent, getSessionUser } from "@/lib/auth/roles";
import { AdminShell } from "./_components/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?next=/admin");
  if (!canManageContent(user)) redirect("/");
  return <AdminShell>{children}</AdminShell>;
}
