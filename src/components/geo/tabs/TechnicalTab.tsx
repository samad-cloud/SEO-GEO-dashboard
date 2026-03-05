'use client';

import { Play, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useCrewRun } from '@/hooks/use-crew-run';

interface TechnicalTabProps {
  region: string;
  onRefresh: () => void;
}

export function TechnicalTab({ region, onRefresh }: TechnicalTabProps) {
  const { isRunning, lastStatus, error, progress, currentStep, start } = useCrewRun('technical', region);
  useEffect(() => { if (lastStatus === 'complete') onRefresh(); }, [lastStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Technical SEO</h2>
        <button
          onClick={start}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm transition-colors"
        >
          {isRunning ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running...</>
          ) : (
            <><Play className="w-3.5 h-3.5" />Run Technical Crew</>
          )}
        </button>
      </div>
      {isRunning && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>{currentStep || 'Running...'}</span><span>{progress}%</span>
          </div>
          <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {lastStatus === 'complete' && (
        <p className="text-xs text-green-400">Technical crew complete. Data refreshed.</p>
      )}
      <div className="text-sm text-zinc-500 py-8 text-center">
        Technical SEO analysis results will appear here after running the crew.
      </div>
    </div>
  );
}
