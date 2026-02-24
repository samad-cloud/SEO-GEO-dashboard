'use client';

import { Header } from '@/components/ui/Header';
import { TabNavigation } from '@/components/ui/TabNavigation';
import { DomainProvider, useDomain } from '@/context/DomainContext';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { selectedDomain, setSelectedDomain } = useDomain();

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <Header
        selectedDomain={selectedDomain}
        onDomainChange={setSelectedDomain}
      />
      <TabNavigation />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DomainProvider>
      <DashboardShell>{children}</DashboardShell>
    </DomainProvider>
  );
}
