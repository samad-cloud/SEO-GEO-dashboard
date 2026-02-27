'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AuditRun, AuditReport } from '@/types/seo';
import {
  fetchAudits,
  fetchAuditDetail,
  type PaginationInfo,
} from '@/lib/api/seo-api';

interface UseSeoAuditsOptions {
  limit?: number;
  domain?: string;
  autoFetch?: boolean;
}

interface UseSeoAuditsResult {
  runs: AuditRun[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

/**
 * Hook for fetching and managing SEO audit list
 */
export function useSeoAudits(options: UseSeoAuditsOptions = {}): UseSeoAuditsResult {
  const { limit = 20, domain, autoFetch = true } = options;

  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const loadAudits = useCallback(
    async (offset = 0, append = false) => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await fetchAudits({ limit, offset, domain });

        if (append) {
          setRuns((prev) => [...prev, ...result.data]);
        } else {
          setRuns(result.data);
        }

        setPagination(result.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audits');
      } finally {
        setIsLoading(false);
      }
    },
    [limit, domain]
  );

  const refresh = useCallback(async () => {
    await loadAudits(0, false);
  }, [loadAudits]);

  const loadMore = useCallback(async () => {
    if (pagination && pagination.hasMore) {
      await loadAudits(pagination.offset + pagination.limit, true);
    }
  }, [pagination, loadAudits]);

  useEffect(() => {
    if (autoFetch) {
      loadAudits(0, false);
    }
  }, [autoFetch, loadAudits]);

  return {
    runs,
    pagination,
    isLoading,
    error,
    refresh,
    loadMore,
  };
}

interface UseAuditReportResult {
  run: AuditRun | null;
  report: AuditReport | null;
  gcsPath: string | null;
  actionPlanGcsPath: string | null;
  jiraTicketsGcsPath: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching single audit detail (summary only).
 * Full GCS report is available via the download endpoint.
 */
export function useAuditReport(auditId: string | null): UseAuditReportResult {
  const [run, setRun] = useState<AuditRun | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [gcsPath, setGcsPath] = useState<string | null>(null);
  const [actionPlanGcsPath, setActionPlanGcsPath] = useState<string | null>(null);
  const [jiraTicketsGcsPath, setJiraTicketsGcsPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!auditId) {
      setRun(null);
      setReport(null);
      setGcsPath(null);
      setActionPlanGcsPath(null);
      setJiraTicketsGcsPath(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await fetchAuditDetail(auditId);

      setRun(result.run);
      setReport(result.report);
      setGcsPath(result.gcs_path ?? null);
      setActionPlanGcsPath(result.action_plan_gcs_path ?? null);
      setJiraTicketsGcsPath(result.jira_tickets_gcs_path ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit detail');
      setRun(null);
      setReport(null);
      setGcsPath(null);
      setActionPlanGcsPath(null);
      setJiraTicketsGcsPath(null);
    } finally {
      setIsLoading(false);
    }
  }, [auditId]);

  const refresh = useCallback(async () => {
    await loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  return {
    run,
    report,
    gcsPath,
    actionPlanGcsPath,
    jiraTicketsGcsPath,
    isLoading,
    error,
    refresh,
  };
}
