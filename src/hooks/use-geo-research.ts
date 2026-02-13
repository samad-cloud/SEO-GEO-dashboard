'use client';

/**
 * React Hooks for GEO Research API
 *
 * Provides hooks for:
 * - Fetching latest research data
 * - Starting and monitoring pipeline runs
 * - Real-time progress updates via SSE
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ResearchRun } from '@/types/geo';
import type {
  RunProgress,
  RunConfig,
  RunListItem,
  StartRunResponse,
} from '@/lib/api/geo-api';

// =============================================================================
// Types
// =============================================================================

interface UseResearchDataResult {
  data: ResearchRun | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseResearchRunsResult {
  runs: RunListItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UsePipelineRunResult {
  runId: string | null;
  progress: RunProgress | null;
  isRunning: boolean;
  error: Error | null;
  start: (config?: RunConfig) => Promise<void>;
  cancel: () => Promise<void>;
}

// =============================================================================
// useResearchData
// =============================================================================

/**
 * Hook to fetch and manage the latest research data
 */
export function useResearchData(): UseResearchDataResult {
  const [data, setData] = useState<ResearchRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/geo/research');

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const json = await response.json();

      // Parse dates
      const parsed: ResearchRun = {
        ...json,
        timestamp: new Date(json.timestamp),
        tasks: json.tasks?.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
        })) || [],
      };

      setData(parsed);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// =============================================================================
// useResearchRuns
// =============================================================================

/**
 * Hook to fetch and manage the list of research runs
 */
export function useResearchRuns(limit: number = 20): UseResearchRunsResult {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRuns = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/geo/research/runs?limit=${limit}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const json = await response.json();
      setRuns(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return { runs, isLoading, error, refetch: fetchRuns };
}

// =============================================================================
// usePipelineRun
// =============================================================================

/**
 * Hook to start and monitor a pipeline run with real-time updates
 */
export function usePipelineRun(): UsePipelineRunResult {
  const [runId, setRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup SSE connection
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Start a new run
  const start = useCallback(async (config: RunConfig = {}) => {
    cleanup();
    setError(null);
    setProgress(null);
    setIsRunning(true);

    try {
      // Start the run
      const response = await fetch('/api/geo/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start run');
      }

      const startResponse: StartRunResponse = await response.json();
      setRunId(startResponse.run_id);

      // Connect to SSE stream
      const eventSource = new EventSource(
        `/api/geo/research/run/${startResponse.run_id}/stream`
      );
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const progressData: RunProgress = JSON.parse(event.data);
          setProgress(progressData);

          // Check if complete
          if (['complete', 'failed', 'cancelled'].includes(progressData.status)) {
            setIsRunning(false);
            cleanup();
          }
        } catch (e) {
          console.error('Failed to parse SSE message:', e);
        }
      };

      eventSource.onerror = () => {
        setError(new Error('Connection to server lost'));
        setIsRunning(false);
        cleanup();
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsRunning(false);
    }
  }, [cleanup]);

  // Cancel the current run
  const cancel = useCallback(async () => {
    if (!runId) return;

    try {
      await fetch(`/api/geo/research/run/${runId}/cancel`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Failed to cancel run:', err);
    }

    cleanup();
    setIsRunning(false);
  }, [runId, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { runId, progress, isRunning, error, start, cancel };
}

// =============================================================================
// useCrewData
// =============================================================================

/**
 * Hook to fetch crew-specific data (blog, forums, wiki, urls)
 */

interface CrewData {
  briefs: any[];
  blogPosts: any[];
  forumThreads: any[];
  wikiAssessments: any[];
  trackedUrls: any[];
}

interface UseCrewDataResult {
  data: CrewData;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCrewData(): UseCrewDataResult {
  const [data, setData] = useState<CrewData>({
    briefs: [],
    blogPosts: [],
    forumThreads: [],
    wikiAssessments: [],
    trackedUrls: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [briefs, posts, threads, wiki, urls] = await Promise.all([
        fetch('/api/geo/blog/briefs').then(r => r.ok ? r.json() : []),
        fetch('/api/geo/blog/posts').then(r => r.ok ? r.json() : []),
        fetch('/api/geo/forums/threads').then(r => r.ok ? r.json() : []),
        fetch('/api/geo/wiki/assessments').then(r => r.ok ? r.json() : []),
        fetch('/api/geo/technical/urls?limit=50').then(r => r.ok ? r.json() : []),
      ]);

      setData({
        briefs: Array.isArray(briefs) ? briefs : [],
        blogPosts: Array.isArray(posts) ? posts : [],
        forumThreads: Array.isArray(threads) ? threads : [],
        wikiAssessments: Array.isArray(wiki) ? wiki : [],
        trackedUrls: Array.isArray(urls) ? urls : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

// =============================================================================
// useAuditReports
// =============================================================================

/**
 * Hook to fetch audit reports
 */
export function useAuditReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/geo/audit/reports');
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      const json = await response.json();
      setReports(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { reports, isLoading, error, refetch: fetchData };
}

// =============================================================================
// useAuditResults
// =============================================================================

/**
 * Hook to fetch audit results for a specific run
 */
export function useAuditResults(runId: string | null) {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!runId) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/geo/audit/results?run_id=${encodeURIComponent(runId)}`);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      const json = await response.json();
      setResults(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { results, isLoading, error, refetch: fetchData };
}

// =============================================================================
// useBlogImages
// =============================================================================

/**
 * Hook to fetch blog images (all or for a specific post)
 */
export function useBlogImages(postId: number | null) {
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (postId === null) {
      setImages([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all images — session linkage handled server-side when post_id endpoint exists
      const response = await fetch('/api/geo/blog/images');
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      const json = await response.json();
      setImages(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { images, isLoading, error };
}

// =============================================================================
// useGeoHealth
// =============================================================================

/**
 * Hook to check GEO API health status
 */
export function useGeoHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_GEO_API_URL || 'http://localhost:8000'}/health`
      );
      setIsHealthy(response.ok);
    } catch {
      setIsHealthy(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { isHealthy, isChecking, checkHealth };
}
