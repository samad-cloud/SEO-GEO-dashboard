'use client';

import { useState } from 'react';
import { Header } from '@/components/ui/Header';
import { TabNavigation } from '@/components/ui/TabNavigation';
import { AuditRunList } from '@/components/seo/AuditRunList';
import { AuditDetail } from '@/components/seo/AuditDetail';
import { GeoPanel } from '@/components/geo/GeoPanel';
import { useSeoAudits, useAuditReport } from '@/hooks/useSeoAudits';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'seo' | 'geo'>('seo');
  const [selectedDomain, setSelectedDomain] = useState('All Domains');
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

  const handleDomainChange = (domain: string) => {
    setSelectedDomain(domain);
    setSelectedAuditId(null);
  };

  // Fetch audit list from BigQuery, filtered by domain
  const {
    runs,
    pagination,
    isLoading: isLoadingList,
    error: listError,
    loadMore,
    refresh: refreshList,
  } = useSeoAudits({
    limit: 20,
    domain: selectedDomain === 'All Domains' ? undefined : selectedDomain,
  });

  // Fetch audit detail when selected
  const {
    run: selectedRun,
    report: selectedReport,
    gcsPath,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useAuditReport(selectedAuditId);

  const handleRunSelect = (runId: string) => {
    setSelectedAuditId(runId);
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <Header
        selectedDomain={selectedDomain}
        onDomainChange={handleDomainChange}
      />

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'seo' ? (
          <div className="flex h-full">
            {/* Left Panel - Audit Run List */}
            <div className="w-80 flex-shrink-0">
              <AuditRunList
                runs={runs}
                selectedRunId={selectedAuditId}
                onSelectRun={handleRunSelect}
                isLoading={isLoadingList}
                error={listError}
                hasMore={pagination?.hasMore ?? false}
                onLoadMore={loadMore}
                onRefresh={refreshList}
              />
            </div>

            {/* Right Panel - Audit Detail */}
            <AuditDetail
              run={selectedRun}
              report={selectedReport}
              gcsPath={gcsPath}
              auditId={selectedAuditId}
              isLoading={isLoadingDetail}
              error={detailError}
            />
          </div>
        ) : (
          <GeoPanel />
        )}
      </main>
    </div>
  );
}
