'use client';

import { Play, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useCrewRun } from '@/hooks/use-crew-run';
import { WikiAssessmentsSection } from '@/components/geo/sections/WikiAssessmentsSection';

interface WikiTabProps {
  crewData: any;
  region: string;
  onRefresh: () => void;
}

export function WikiTab({ crewData, region, onRefresh }: WikiTabProps) {
  const { isRunning, lastStatus, error, progress, currentStep, start } = useCrewRun('wiki', region);
  useEffect(() => { if (lastStatus === 'complete') onRefresh(); }, [lastStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Wiki Assessments</h2>
        <button
          onClick={start}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm transition-colors"
        >
          {isRunning ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running...</>
          ) : (
            <><Play className="w-3.5 h-3.5" />Run Wiki Crew</>
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
        <p className="text-xs text-green-400">Wiki crew complete. Data refreshed.</p>
      )}
      <WikiAssessmentsSection assessments={crewData?.wikiAssessments ?? []} />
    </div>
  );
}
