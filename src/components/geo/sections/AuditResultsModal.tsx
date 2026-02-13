'use client';

import { useState } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Filter,
  ExternalLink,
  Calendar,
} from 'lucide-react';

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
import { useAuditResults } from '@/hooks/use-geo-research';

interface AuditResultsModalProps {
  runId: string;
  onClose: () => void;
}

const sentimentColors: Record<string, string> = {
  positive: 'bg-green-500/20 text-green-400',
  neutral: 'bg-zinc-500/20 text-zinc-400',
  negative: 'bg-red-500/20 text-red-400',
  mixed: 'bg-yellow-500/20 text-yellow-400',
};

function ResultRow({ result }: { result: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-zinc-700/50 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-300 truncate">{result.prompt}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] uppercase text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-700">
              {result.platform}
            </span>
            {result.brandMentioned ? (
              <span className="flex items-center gap-0.5 text-[10px] text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                Brand mentioned
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                <XCircle className="w-3 h-3" />
                Not mentioned
              </span>
            )}
            {result.sentiment && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${sentimentColors[result.sentiment] || sentimentColors.neutral}`}>
                {result.sentiment}
              </span>
            )}
            {result.competitorsMentioned?.length > 0 && (
              <span className="text-[10px] text-orange-400">
                {result.competitorsMentioned.length} competitor{result.competitorsMentioned.length > 1 ? 's' : ''}
              </span>
            )}
            {result.createdAt && (
              <span className="text-[10px] text-zinc-600">{formatDate(result.createdAt)}</span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Full response */}
          {result.response && (
            <div>
              <h6 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1">LLM Response</h6>
              <div className="p-2.5 rounded bg-zinc-900/50 border border-zinc-700/50 text-xs text-zinc-300 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                {result.response}
              </div>
            </div>
          )}

          {/* Competitors */}
          {result.competitorsMentioned?.length > 0 && (
            <div>
              <h6 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1">Competitors Mentioned</h6>
              <div className="flex flex-wrap gap-1">
                {result.competitorsMentioned.map((c: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Citations */}
          {result.citationUrls?.length > 0 && (
            <div>
              <h6 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1">Citation URLs</h6>
              <div className="space-y-1">
                {result.citationUrls.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 truncate"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    {url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Brand position */}
          {result.brandPosition !== null && result.brandPosition !== undefined && (
            <div className="text-xs text-zinc-400">
              Brand Position: <span className="text-zinc-200 font-medium">#{result.brandPosition}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditResultsModal({ runId, onClose }: AuditResultsModalProps) {
  const { results, isLoading, error } = useAuditResults(runId);
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('all');

  // Derive platform options
  const platforms = Array.from(new Set(results.map((r) => r.platform))).filter(Boolean).sort();

  // Apply filters
  const filtered = results.filter((r) => {
    if (platformFilter && r.platform !== platformFilter) return false;
    if (brandFilter === 'mentioned' && !r.brandMentioned) return false;
    if (brandFilter === 'not_mentioned' && r.brandMentioned) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-zinc-900 border-l border-zinc-700 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-zinc-200">Audit Results</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Run: {runId} &middot; {filtered.length} of {results.length} results
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          {/* Filters */}
          {!isLoading && results.length > 0 && (
            <div className="flex items-center gap-3 mt-3">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300"
              >
                <option value="">All Platforms</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300"
              >
                <option value="all">Brand: All</option>
                <option value="mentioned">Brand: Mentioned</option>
                <option value="not_mentioned">Brand: Not Mentioned</option>
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-red-400">{error.message}</div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-zinc-500">No results found.</p>
          ) : (
            filtered.map((result) => (
              <ResultRow key={result.id} result={result} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
