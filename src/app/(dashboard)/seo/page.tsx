'use client';

import { useState, useEffect } from 'react';
import { AuditRunList } from '@/components/seo/AuditRunList';
import { AuditDetail } from '@/components/seo/AuditDetail';
import { TicketGenerationTab } from '@/components/seo/TicketGenerationTab';
import { useSeoAudits, useAuditReport } from '@/hooks/useSeoAudits';
import { useDomain } from '@/context/DomainContext';

export default function SeoPage() {
  const { selectedDomain } = useDomain();
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'audits' | 'tickets'>('audits');

  // Reset selection when domain changes
  useEffect(() => {
    setSelectedAuditId(null);
  }, [selectedDomain]);

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
    actionPlanGcsPath,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useAuditReport(selectedAuditId);

  return (
    <div className="flex flex-col h-full">
      {/* Top-level tab bar */}
      <div className="flex border-b border-zinc-800 px-4 flex-shrink-0">
        {(['audits', 'tickets'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'text-blue-500 border-blue-500'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            {tab === 'tickets' ? 'Ticket Generation' : 'Audits'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'audits' ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Audit Run List */}
          <div className="w-80 flex-shrink-0">
            <AuditRunList
              runs={runs}
              selectedRunId={selectedAuditId}
              onSelectRun={setSelectedAuditId}
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
            actionPlanGcsPath={actionPlanGcsPath}
            isLoading={isLoadingDetail}
            error={detailError}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <TicketGenerationTab />
        </div>
      )}
    </div>
  );
}
