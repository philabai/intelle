import { localizedRedirect } from "@/i18n/redirect";
import { getSessionUser } from "@/lib/auth/roles";
import { CustomerShell } from "./_components/CustomerShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) return localizedRedirect("/auth/login?next=/dashboard");
  return <CustomerShell email={user.email}>{children}</CustomerShell>;
}
