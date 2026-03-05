'use client';

import { useState, useCallback } from 'react';

export type CrewType = 'audit' | 'blog' | 'forums' | 'wiki' | 'technical';

interface CrewRunState {
  isRunning: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
  lastStatus: 'idle' | 'running' | 'complete' | 'error';
}

export function useCrewRun(crewType: CrewType, region: string = 'us') {
  const [state, setState] = useState<CrewRunState>({
    isRunning: false,
    progress: 0,
    currentStep: '',
    error: null,
    lastStatus: 'idle',
  });

  const start = useCallback(async (): Promise<boolean> => {
    setState(s => ({ ...s, isRunning: true, error: null, lastStatus: 'running', progress: 0 }));
    try {
      const endpointMap: Record<CrewType, string> = {
        audit: '/api/geo/audit/run',
        blog: '/api/geo/blog/generate',
        forums: '/api/geo/forums/run',
        wiki: '/api/geo/wiki/run',
        technical: '/api/geo/technical/run',
      };
      const res = await fetch(endpointMap[crewType], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState(s => ({ ...s, isRunning: false, lastStatus: 'complete', progress: 100 }));
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setState(s => ({ ...s, isRunning: false, lastStatus: 'error', error: message }));
      return false;
    }
  }, [crewType, region]);

  const reset = useCallback(() => {
    setState({ isRunning: false, progress: 0, currentStep: '', error: null, lastStatus: 'idle' });
  }, []);

  return { ...state, start, reset };
}
