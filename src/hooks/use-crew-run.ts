'use client';

import { useState, useCallback, useRef } from 'react';

export type CrewType = 'audit' | 'blog' | 'forums' | 'wiki' | 'technical';

interface CrewRunState {
  isRunning: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
  lastStatus: 'idle' | 'running' | 'complete' | 'error';
}

const POST_ENDPOINTS: Record<CrewType, string> = {
  audit: '/api/geo/audit/run',
  blog: '/api/geo/blog/generate',
  forums: '/api/geo/forums/run',
  wiki: '/api/geo/wiki/run',
  technical: '/api/geo/technical/run',
};

const STATUS_ENDPOINTS: Record<CrewType, (id: string) => string> = {
  audit: id => `/api/geo/audit/run/${id}`,
  blog: id => `/api/geo/audit/run/${id}`, // blog uses audit run tracker
  forums: id => `/api/geo/forums/run/${id}`,
  wiki: id => `/api/geo/wiki/run/${id}`,
  technical: id => `/api/geo/technical/run/${id}`,
};

export function useCrewRun(crewType: CrewType, region: string = 'us') {
  const [state, setState] = useState<CrewRunState>({
    isRunning: false,
    progress: 0,
    currentStep: '',
    error: null,
    lastStatus: 'idle',
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const start = useCallback(async (): Promise<boolean> => {
    stopPolling();
    setState({ isRunning: true, progress: 0, currentStep: 'Starting...', error: null, lastStatus: 'running' });

    try {
      const res = await fetch(POST_ENDPOINTS[crewType], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const runId: string | undefined = data?.run_id;

      // If no run_id returned (e.g. blog returns one), mark complete immediately
      if (!runId) {
        setState(s => ({ ...s, isRunning: false, lastStatus: 'complete', progress: 100, currentStep: '' }));
        return true;
      }

      // Poll status endpoint until done
      const statusUrl = STATUS_ENDPOINTS[crewType](runId);
      pollRef.current = setInterval(async () => {
        try {
          const poll = await fetch(statusUrl, { cache: 'no-store' });
          if (!poll.ok) return; // keep polling on transient errors
          const progress = await poll.json();
          const status: string = progress?.status ?? 'running';
          const pct: number = progress?.progress_percent ?? 0;
          const step: string = progress?.current_step ?? '';

          setState(s => ({ ...s, progress: pct, currentStep: step }));

          if (status === 'complete' || status === 'failed' || status === 'cancelled') {
            stopPolling();
            const isOk = status === 'complete';
            setState(s => ({
              ...s,
              isRunning: false,
              lastStatus: isOk ? 'complete' : 'error',
              progress: isOk ? 100 : s.progress,
              error: isOk ? null : progress?.errors?.[0] ?? 'Run failed',
            }));
          }
        } catch {
          // network blip — keep polling
        }
      }, 4000);

      return true;
    } catch (e) {
      stopPolling();
      const message = e instanceof Error ? e.message : String(e);
      setState({ isRunning: false, progress: 0, currentStep: '', error: message, lastStatus: 'error' });
      return false;
    }
  }, [crewType, region]);

  const reset = useCallback(() => {
    stopPolling();
    setState({ isRunning: false, progress: 0, currentStep: '', error: null, lastStatus: 'idle' });
  }, []);

  return { ...state, start, reset };
}
