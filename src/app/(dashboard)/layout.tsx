import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/ui/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = user?.email === "admin@printerpix.com";

  return <DashboardShell isAdmin={isAdmin}>{children}</DashboardShell>;
}
