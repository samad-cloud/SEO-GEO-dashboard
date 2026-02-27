'use client';

import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { BarChart3, AlertCircle } from 'lucide-react';
import { AuditReport, AuditRun } from '@/types/seo';
import { formatDateTime, formatDuration, getHealthScoreColor } from '@/lib/utils';
import { SummaryTab } from './tabs/SummaryTab';
import { IssuesTab } from './tabs/IssuesTab';
import { MetricsTab } from './tabs/MetricsTab';
import { AiAnalysisTab } from './tabs/AiAnalysisTab';
import { UrlIssuesTab } from './tabs/UrlIssuesTab';
import { RawJsonTab } from './tabs/RawJsonTab';
import { TicketsTab } from './tabs/TicketsTab';

interface AuditDetailProps {
  run: AuditRun | null;
  report: AuditReport | null;
  gcsPath?: string | null;
  auditId?: string | null;
  actionPlanGcsPath?: string | null;
  jiraTicketsGcsPath?: string | null;
  isLoading?: boolean;
  error?: string | null;
}

function DetailSkeleton() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-pulse">
      {/* Header skeleton */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded bg-zinc-700" />
          <div className="h-4 w-48 bg-zinc-700 rounded" />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="h-3 w-32 bg-zinc-700 rounded" />
          <div className="h-3 w-24 bg-zinc-700 rounded" />
        </div>

        {/* Health Score Card skeleton */}
        <div className="mt-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <div className="h-3 w-20 bg-zinc-700 rounded mb-2" />
          <div className="flex items-center gap-4">
            <div className="h-10 w-16 bg-zinc-700 rounded" />
            <div className="flex flex-col gap-1">
              <div className="h-4 w-12 bg-zinc-700 rounded" />
              <div className="h-3 w-24 bg-zinc-700 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex border-b border-zinc-800 px-4 gap-4 py-2">
        <div className="h-4 w-16 bg-zinc-700 rounded" />
        <div className="h-4 w-12 bg-zinc-700 rounded" />
        <div className="h-4 w-14 bg-zinc-700 rounded" />
        <div className="h-4 w-20 bg-zinc-700 rounded" />
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-4 space-y-4">
        <div className="h-24 bg-zinc-800/50 rounded-lg" />
        <div className="h-32 bg-zinc-800/50 rounded-lg" />
        <div className="h-20 bg-zinc-800/50 rounded-lg" />
      </div>
    </div>
  );
}

export function AuditDetail({ run, report, gcsPath, auditId, actionPlanGcsPath, jiraTicketsGcsPath, isLoading = false, error = null }: AuditDetailProps) {
  const [activeTab, setActiveTab] = useState('summary');

  // Loading state
  if (isLoading) {
    return <DetailSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-zinc-300 mb-2">Failed to Load Audit</h3>
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!run || !report) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No Audit Selected</h3>
          <p className="text-sm text-zinc-500 max-w-xs">
            Select an audit from the list to view detailed results and metrics.
          </p>
        </div>
      </div>
    );
  }

  const previousScore = 45; // Mock previous score
  const scoreChange = report.summary.average_health_score - previousScore;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h2 className="text-sm font-semibold text-zinc-300">
            AUDIT: {formatDateTime(run.date)}
          </h2>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>Domains: {run.domains.join(', ')}</span>
          <span>Duration: {formatDuration(run.duration)}</span>
          <span className="text-green-500">Status: Completed</span>
        </div>

        {/* Health Score Card */}
        <div className="mt-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Health Score
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-bold ${getHealthScoreColor(report.summary.average_health_score)}`}>
                {report.summary.average_health_score}
              </span>
              <span className="text-lg text-zinc-500">/100</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-red-500">Poor</span>
              <span className={`text-xs ${scoreChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {scoreChange >= 0 ? '↑' : '↓'} {Math.abs(scoreChange)} from last run
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <Tabs.List className="flex border-b border-zinc-800 px-4">
          {['Summary', 'Issues', 'URL Issues', 'Metrics', 'AI Analysis', 'Tickets', 'Raw JSON'].map((tab) => (
            <Tabs.Trigger
              key={tab}
              value={tab.toLowerCase().replace(' ', '-')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.toLowerCase().replace(' ', '-')
                  ? 'text-blue-500 border-blue-500'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              {tab}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="flex-1 overflow-y-auto">
          <Tabs.Content value="summary" className="p-4">
            <SummaryTab report={report} />
          </Tabs.Content>
          <Tabs.Content value="issues" className="p-4">
            <IssuesTab report={report} />
          </Tabs.Content>
          <Tabs.Content value="url-issues" className="p-4">
            <UrlIssuesTab auditId={auditId} gcsPath={gcsPath} />
          </Tabs.Content>
          <Tabs.Content value="metrics" className="p-4">
            <MetricsTab report={report} />
          </Tabs.Content>
          <Tabs.Content value="ai-analysis" className="p-4">
            <AiAnalysisTab aiAnalysis={report.reports[0]?.ai_analysis} auditId={auditId} existingActionPlanPath={actionPlanGcsPath} />
          </Tabs.Content>
          <Tabs.Content value="tickets" className="p-4">
            <TicketsTab auditId={auditId} existingTicketsGcsPath={jiraTicketsGcsPath ?? null} />
          </Tabs.Content>
          <Tabs.Content value="raw-json" className="p-4">
            <RawJsonTab
              report={report}
              gcsPath={gcsPath}
              auditId={auditId}
            />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
