"use client";

import { Header } from "@/components/ui/Header";
import { TabNavigation } from "@/components/ui/TabNavigation";
import { DomainProvider, useDomain } from "@/context/DomainContext";

function Shell({
  children,
  isAdmin,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
}) {
  const { selectedDomain, setSelectedDomain } = useDomain();

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <Header
        selectedDomain={selectedDomain}
        onDomainChange={setSelectedDomain}
        isAdmin={isAdmin}
      />
      <TabNavigation />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

export function DashboardShell({
  children,
  isAdmin,
}: {
  children: React.ReactNode;
  isAdmin: boolean;
}) {
  return (
    <DomainProvider>
      <Shell isAdmin={isAdmin}>{children}</Shell>
    </DomainProvider>
  );
}
