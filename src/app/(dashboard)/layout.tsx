import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/ui/DashboardShell";
import { isAdminUser } from "@/lib/auth/is-admin";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = isAdminUser(user?.email);

  return <DashboardShell isAdmin={isAdmin}>{children}</DashboardShell>;
}
