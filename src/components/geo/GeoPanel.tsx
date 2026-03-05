'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Play,
  Square,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useResearchData, usePipelineRun, useGeoHealth, useCrewData, useAuditReports } from '@/hooks/use-geo-research';
import { type CrewType } from '@/hooks/use-crew-run';
import { AuditTab } from './tabs/AuditTab';
import { BlogTab } from './tabs/BlogTab';
import { ForumsTab } from './tabs/ForumsTab';
import { WikiTab } from './tabs/WikiTab';
import { TechnicalTab } from './tabs/TechnicalTab';
import type { RunProgress } from '@/lib/api/geo-api';

const TABS: { id: CrewType; label: string }[] = [
  { id: 'audit', label: 'Audit' },
  { id: 'blog', label: 'Blog' },
  { id: 'forums', label: 'Forums' },
  { id: 'wiki', label: 'Wiki' },
  { id: 'technical', label: 'Technical' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HealthDot({ isHealthy }: { isHealthy: boolean | null }) {
  if (isHealthy === null) return <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />;
  return (
    <span
      className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}
      title={isHealthy ? 'GEO API connected' : 'GEO API offline'}
    />
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: RunProgress }) {
  const stageLabels: Record<string, string> = {
    initializing: 'Initializing',
    research: 'LLM Audit',
    analysis: 'Content Analysis',
    strategy: 'Strategy',
    content_generation: 'Content Generation',
    complete: 'Complete',
    error: 'Error',
  };

  return (
    <div className="p-4 rounded-lg bg-zinc-800/50 border border-purple-500/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          <span className="text-sm font-medium text-zinc-200">
            {stageLabels[progress.stage] || progress.stage}
          </span>
        </div>
        <span className="text-xs text-zinc-400">{progress.progress_percent}%</span>
      </div>
      <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${progress.progress_percent}%` }}
        />
      </div>
      <p className="text-xs text-zinc-500 mt-1">{progress.current_step}</p>
      {progress.errors.length > 0 && (
        <div className="mt-2 text-xs text-red-400">
          {progress.errors[progress.errors.length - 1]}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true, count }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 text-left group"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
          {count !== undefined && count > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-zinc-700 text-[10px] text-zinc-400">
              {count}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
        )}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

export function GeoPanel() {
  const { data, isLoading, error, refetch } = useResearchData();
  const { isHealthy } = useGeoHealth();
  const { progress, isRunning, error: runError, start, cancel } = usePipelineRun();
  const { data: crewData, isLoading: crewLoading, refetch: refetchCrew } = useCrewData();
  const { reports: auditReports, refetch: refetchAudit } = useAuditReports();
  const [activeTab, setActiveTab] = useState<CrewType>('audit');

  const handleRunResearch = async () => {
    await start({ regions: ['us'] });
  };

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchCrew(), refetchAudit()]);
  };

  // Run completed — refetch data once
  const hasRefetched = useRef(false);
  useEffect(() => {
    if (progress?.status === 'complete' && !isRunning && !hasRefetched.current) {
      hasRefetched.current = true;
      const timer = setTimeout(() => {
        refetch();
        refetchCrew();
        refetchAudit();
      }, 1500);
      return () => clearTimeout(timer);
    }
    if (progress?.status !== 'complete') {
      hasRefetched.current = false;
    }
  }, [progress?.status, isRunning, refetch, refetchCrew, refetchAudit]);

  // Loading state
  if (isLoading && !data && crewLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Loading research data...</p>
        </div>
      </div>
    );
  }

  // Error state (no data at all)
  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-zinc-200 mb-2">Connection Error</h2>
          <p className="text-sm text-zinc-500 mb-4">{error.message}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Check if there's any data to show (research OR crew data)
  const hasResearchData = data && (data.id || data.shareOfModel > 0);
  const hasCrewData = crewData.briefs.length > 0 ||
    crewData.blogPosts.length > 0 ||
    crewData.forumThreads.length > 0 ||
    crewData.wikiAssessments.length > 0;
  const hasAnyData = hasResearchData || hasCrewData;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">GEO Intelligence</h1>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <HealthDot isHealthy={isHealthy} />
                <span>{isHealthy ? 'API Connected' : isHealthy === false ? 'API Offline' : 'Checking...'}</span>
                {data?.id && (
                  <>
                    <span className="text-zinc-700">|</span>
                    <span>Run: {data.id}</span>
                  </>
                )}
                {(data as any)?._mock && (
                  <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px]">
                    SAMPLE DATA
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {isRunning ? (
              <button
                onClick={cancel}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
              >
                <Square className="w-4 h-4" />
                Cancel Run
              </button>
            ) : (
              <button
                onClick={handleRunResearch}
                disabled={isHealthy === false}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors"
              >
                <Play className="w-4 h-4" />
                Run Research
              </button>
            )}
          </div>
        </div>

        {/* Pipeline Progress */}
        {isRunning && progress && <ProgressBar progress={progress} />}

        {/* Run error */}
        {runError && !isRunning && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            <XCircle className="w-4 h-4 flex-shrink-0" />
            {runError.message}
          </div>
        )}

        {/* Run completed notification */}
        {progress?.status === 'complete' && !isRunning && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Research run completed successfully. Data refreshed.
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex gap-1 border-b border-zinc-700/50">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                activeTab === tab.id
                  ? 'text-purple-400 border-b-2 border-purple-400 -mb-px'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'audit' && (
          <AuditTab
            data={data}
            auditReports={auditReports}
            region="us"
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === 'blog' && (
          <BlogTab
            crewData={crewData}
            region="us"
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === 'forums' && (
          <ForumsTab
            crewData={crewData}
            region="us"
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === 'wiki' && (
          <WikiTab
            crewData={crewData}
            region="us"
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === 'technical' && (
          <TechnicalTab
            region="us"
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  );
}
