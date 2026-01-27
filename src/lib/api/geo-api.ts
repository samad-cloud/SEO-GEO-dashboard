/**
 * GEO API Client
 *
 * Client for communicating with the GEO backend API.
 * Supports REST endpoints and Server-Sent Events for live updates.
 */

import type {
  ResearchRun,
  GeoTask,
  Platform,
  Region,
} from '@/types/geo';

// =============================================================================
// Configuration
// =============================================================================

const GEO_API_BASE_URL = process.env.NEXT_PUBLIC_GEO_API_URL || 'http://localhost:8000';

// =============================================================================
// Types
// =============================================================================

export type RunStatus = 'pending' | 'running' | 'complete' | 'failed' | 'cancelled';

export type PipelineStage =
  | 'initializing'
  | 'research'
  | 'analysis'
  | 'strategy'
  | 'content_generation'
  | 'complete'
  | 'error';

export interface RunConfig {
  prompts?: string[];
  regions?: string[];
  use_mock?: boolean;
  quick_mode?: boolean;
}

export interface RunProgress {
  run_id: string;
  status: RunStatus;
  stage: PipelineStage;
  progress_percent: number;
  current_step: string;
  messages_processed: number;
  tasks_created: number;
  tasks_completed: number;
  errors: string[];
  results?: {
    share_of_model?: number;
    prompts_audited?: number;
    opportunities_count?: number;
    competitor_insights_count?: number;
    tasks_created?: number;
    content_drafts?: Array<{
      draft_id: string;
      title: string;
      word_count: number;
    }>;
    research_run_id?: string;
  };
  timestamp: string;
}

export interface StartRunResponse {
  run_id: string;
  status: RunStatus;
  stream_url: string;
  message: string;
}

export interface RunListItem {
  id: string;
  status: RunStatus;
  started_at: string;
  completed_at?: string;
  regions: string[];
  prompts_count: number;
  share_of_model?: number;
  opportunities_count: number;
  errors_count: number;
}

export interface ApiError {
  error: string;
  details?: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch the latest research data
 */
export async function fetchLatestResearch(): Promise<ResearchRun> {
  const response = await fetch(`${GEO_API_BASE_URL}/api/geo/research`);

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || 'Failed to fetch research data');
  }

  const data = await response.json();

  // Parse dates
  return {
    ...data,
    timestamp: new Date(data.timestamp),
    tasks: data.tasks?.map((task: GeoTask) => ({
      ...task,
      createdAt: new Date(task.createdAt),
    })) || [],
  };
}

/**
 * Fetch list of research runs
 */
export async function fetchResearchRuns(limit: number = 20): Promise<RunListItem[]> {
  const response = await fetch(`${GEO_API_BASE_URL}/api/geo/research/runs?limit=${limit}`);

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || 'Failed to fetch research runs');
  }

  return response.json();
}

/**
 * Get status of a specific run
 */
export async function fetchRunStatus(runId: string): Promise<RunProgress> {
  const response = await fetch(`${GEO_API_BASE_URL}/api/geo/research/run/${encodeURIComponent(runId)}`);

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || 'Failed to fetch run status');
  }

  return response.json();
}

/**
 * Start a new research run
 */
export async function startResearchRun(config: RunConfig = {}): Promise<StartRunResponse> {
  const response = await fetch(`${GEO_API_BASE_URL}/api/geo/research/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || 'Failed to start research run');
  }

  return response.json();
}

/**
 * Cancel a running pipeline
 */
export async function cancelRun(runId: string): Promise<{ status: string; run_id: string }> {
  const response = await fetch(
    `${GEO_API_BASE_URL}/api/geo/research/run/${encodeURIComponent(runId)}/cancel`,
    { method: 'POST' }
  );

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || 'Failed to cancel run');
  }

  return response.json();
}

/**
 * Subscribe to live updates for a pipeline run via Server-Sent Events
 *
 * @param runId - The run ID to subscribe to
 * @param onProgress - Callback for progress updates
 * @param onComplete - Callback when run completes
 * @param onError - Callback for errors
 * @returns Cleanup function to close the connection
 */
export function subscribeToRunUpdates(
  runId: string,
  callbacks: {
    onProgress?: (progress: RunProgress) => void;
    onComplete?: (progress: RunProgress) => void;
    onError?: (error: Error) => void;
  }
): () => void {
  const { onProgress, onComplete, onError } = callbacks;

  const eventSource = new EventSource(
    `${GEO_API_BASE_URL}/api/geo/research/run/${encodeURIComponent(runId)}/stream`
  );

  eventSource.onmessage = (event) => {
    try {
      const progress: RunProgress = JSON.parse(event.data);

      onProgress?.(progress);

      // Check if run is complete
      if (['complete', 'failed', 'cancelled'].includes(progress.status)) {
        onComplete?.(progress);
        eventSource.close();
      }
    } catch (e) {
      console.error('Failed to parse SSE message:', e);
    }
  };

  eventSource.onerror = (event) => {
    console.error('SSE connection error:', event);
    onError?.(new Error('Connection to server lost'));
    eventSource.close();
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}

/**
 * Check if the GEO API is healthy
 */
export async function checkHealth(): Promise<{
  status: string;
  timestamp: string;
  shared_state: boolean;
}> {
  const response = await fetch(`${GEO_API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error('GEO API is not healthy');
  }

  return response.json();
}

// =============================================================================
// React Hooks Support
// =============================================================================

/**
 * Create an EventSource for SSE with automatic reconnection
 * Use this with React hooks like useSyncExternalStore
 */
export function createRunUpdateSubscription(runId: string) {
  let listeners: Set<(progress: RunProgress) => void> = new Set();
  let eventSource: EventSource | null = null;
  let lastProgress: RunProgress | null = null;

  const connect = () => {
    if (eventSource) return;

    eventSource = new EventSource(
      `${GEO_API_BASE_URL}/api/geo/research/run/${encodeURIComponent(runId)}/stream`
    );

    eventSource.onmessage = (event) => {
      try {
        const progress: RunProgress = JSON.parse(event.data);
        lastProgress = progress;
        listeners.forEach((listener) => listener(progress));

        // Auto-close on completion
        if (['complete', 'failed', 'cancelled'].includes(progress.status)) {
          disconnect();
        }
      } catch (e) {
        console.error('Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = () => {
      // Attempt reconnection after 5 seconds
      disconnect();
      setTimeout(connect, 5000);
    };
  };

  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };

  return {
    subscribe: (listener: (progress: RunProgress) => void) => {
      listeners.add(listener);
      if (listeners.size === 1) {
        connect();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          disconnect();
        }
      };
    },
    getSnapshot: () => lastProgress,
    disconnect,
  };
}
