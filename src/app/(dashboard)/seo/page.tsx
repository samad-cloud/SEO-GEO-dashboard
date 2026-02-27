'use client';

import { useState, useEffect } from 'react';
import { AuditRunList } from '@/components/seo/AuditRunList';
import { AuditDetail } from '@/components/seo/AuditDetail';
import { useSeoAudits, useAuditReport } from '@/hooks/useSeoAudits';
import { useDomain } from '@/context/DomainContext';

export default function SeoPage() {
  const { selectedDomain } = useDomain();
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

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
    jiraTicketsGcsPath,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useAuditReport(selectedAuditId);

  return (
    <div className="flex h-full">
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
        jiraTicketsGcsPath={jiraTicketsGcsPath}
        isLoading={isLoadingDetail}
        error={detailError}
      />
    </div>
  );
}
