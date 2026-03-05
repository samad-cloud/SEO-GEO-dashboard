'use client';

import { Play, Loader2 } from 'lucide-react';
import { useCrewRun } from '@/hooks/use-crew-run';
import { AuditReportsSection } from '@/components/geo/sections/AuditReportsSection';
import { PlatformBreakdownSection } from '@/components/geo/sections/PlatformBreakdown';
import { DataVoidsSection } from '@/components/geo/sections/DataVoids';
import { CompetitorInsightsSection } from '@/components/geo/sections/CompetitorInsights';
import { CitationsSection } from '@/components/geo/sections/Citations';
import { SERANKINGLeaderboard } from '../sections/SERANKINGLeaderboard';

interface AuditTabProps {
  data: any;
  auditReports: any[];
  region: string;
  onRefresh: () => void;
}

export function AuditTab({ data, auditReports, region, onRefresh }: AuditTabProps) {
  const { isRunning, lastStatus, error, start } = useCrewRun('audit', region);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Audit Intelligence</h2>
        <button
          onClick={async () => { const ok = await start(); if (ok) onRefresh(); }}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm transition-colors"
        >
          {isRunning ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running...</>
          ) : (
            <><Play className="w-3.5 h-3.5" />Run Audit</>
          )}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {lastStatus === 'complete' && (
        <p className="text-xs text-green-400">Audit complete. Refresh to see results.</p>
      )}
      {data?.macroSomByEngine && Object.keys(data.macroSomByEngine).length > 0 && (
        <SERANKINGLeaderboard
          macroSomByEngine={data.macroSomByEngine}
          somTrend={data.somTrend ?? 0}
          leaderboard={data.leaderboard ?? []}
        />
      )}
      <AuditReportsSection reports={auditReports} onRefresh={onRefresh} />
      {(data?.platformBreakdown?.length ?? 0) > 0 && <PlatformBreakdownSection platforms={data.platformBreakdown} />}
      {(data?.dataVoidsList?.length ?? 0) > 0 && <DataVoidsSection voids={data.dataVoidsList} />}
      {(data?.competitorInsights?.length ?? 0) > 0 && <CompetitorInsightsSection competitors={data.competitorInsights} />}
      {(data?.citationsWithContext?.length ?? 0) > 0 && <CitationsSection citations={data.citationsWithContext} />}
    </div>
  );
}
