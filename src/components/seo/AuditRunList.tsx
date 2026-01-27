'use client';

import { Search, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { AuditRun } from '@/types/seo';
import { formatDate, formatTime, formatDuration, formatNumber, getStatusDot } from '@/lib/utils';
import { useState } from 'react';

interface AuditRunListProps {
  runs: AuditRun[];
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
  isLoading?: boolean;
  error?: string | null;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
}

function SkeletonCard() {
  return (
    <div className="w-full p-3 rounded-lg border bg-zinc-800/50 border-zinc-700/50 animate-pulse">
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 rounded-full bg-zinc-700" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-20 bg-zinc-700 rounded" />
            <div className="h-4 w-12 bg-zinc-700 rounded" />
          </div>
          <div className="h-3 w-32 bg-zinc-700 rounded mb-3" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-12 bg-zinc-700 rounded" />
            <div className="h-6 w-20 bg-zinc-700 rounded" />
          </div>
          <div className="h-3 w-24 bg-zinc-700 rounded mt-2" />
        </div>
      </div>
    </div>
  );
}

export function AuditRunList({
  runs,
  selectedRunId,
  onSelectRun,
  isLoading = false,
  error = null,
  hasMore = false,
  onLoadMore,
  onRefresh,
}: AuditRunListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filteredRuns = runs.filter((run) =>
    run.domains.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleLoadMore = async () => {
    if (onLoadMore && !isLoadingMore) {
      setIsLoadingMore(true);
      await onLoadMore();
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="flex flex-col h-full border-r border-zinc-800">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-300">SEO Technical Audits</h2>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search runs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 m-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {/* Audit Runs */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide px-2 py-2">
          Audit Runs
        </div>

        <div className="space-y-2">
          {/* Loading skeleton */}
          {isLoading && runs.length === 0 && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {/* Audit list */}
          {filteredRuns.map((run) => (
            <button
              key={run.id}
              onClick={() => onSelectRun(run.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedRunId === run.id
                  ? 'bg-blue-600/10 border-blue-500/50'
                  : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{getStatusDot(run.healthScore)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-200 font-medium">
                      {formatDate(run.date)}
                    </span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400">{formatTime(run.date)}</span>
                  </div>
                  <div className="text-xs text-zinc-500 truncate mt-0.5">
                    {run.domains.join(' + ')}
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold text-zinc-200">
                        {run.healthScore}<span className="text-xs text-zinc-500">/100</span>
                      </span>
                      <span className="text-xs text-zinc-500">Health</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-300">
                        {formatNumber(run.totalIssues)} issues
                      </span>
                      <span className="text-xs text-red-500">
                        +{formatNumber(run.newIssues)} new
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500 mt-2">
                    Duration: {formatDuration(run.duration)}
                  </div>
                </div>
              </div>
            </button>
          ))}

          {/* Empty state */}
          {!isLoading && !error && runs.length === 0 && (
            <div className="p-4 text-center text-zinc-500 text-sm">
              No audits found
            </div>
          )}

          {/* No search results */}
          {!isLoading && runs.length > 0 && filteredRuns.length === 0 && (
            <div className="p-4 text-center text-zinc-500 text-sm">
              No audits match your search
            </div>
          )}
        </div>

        {/* Load more button */}
        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="w-full text-center py-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Show more...'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
