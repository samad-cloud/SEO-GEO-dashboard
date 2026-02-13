'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  BarChart3,
  Eye,
  Calendar,
  Hash,
} from 'lucide-react';
import { AuditResultsModal } from './AuditResultsModal';

interface AuditReport {
  id: string;
  runId: string;
  region: string;
  shareOfModel: number | null;
  platformBreakdown: Record<string, number> | null;
  competitorShare: Record<string, number> | null;
  categoryBreakdown: Record<string, any> | null;
  dataVoids: any[] | null;
  totalPrompts: number;
  totalResponses: number;
  successRate: number;
  createdAt: string;
}

interface AuditReportsSectionProps {
  reports: AuditReport[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function SomBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-zinc-500">--</span>;
  const pct = typeof value === 'number' && value <= 1 ? (value * 100).toFixed(1) : value;
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
      {pct}% SoM
    </span>
  );
}

function PlatformBreakdownTable({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = Object.entries(breakdown).sort((a, b) => (b[1] as number) - (a[1] as number));
  if (entries.length === 0) return <p className="text-xs text-zinc-500">No platform data</p>;

  return (
    <div className="rounded-lg border border-zinc-700 overflow-hidden">
      <table className="w-full data-table text-sm">
        <thead className="bg-zinc-800/50">
          <tr>
            <th>Platform</th>
            <th>Share</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([platform, share]) => {
            const pct = typeof share === 'number' && share <= 1 ? (share * 100).toFixed(1) : share;
            return (
              <tr key={platform}>
                <td className="text-zinc-300 capitalize">{platform}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${typeof share === 'number' && share <= 1 ? share * 100 : share}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400">{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CompetitorShareChart({ share }: { share: Record<string, number> }) {
  const entries = Object.entries(share).sort((a, b) => (b[1] as number) - (a[1] as number));
  if (entries.length === 0) return <p className="text-xs text-zinc-500">No competitor data</p>;

  const maxVal = Math.max(...entries.map(([, v]) => (typeof v === 'number' ? v : 0)));

  return (
    <div className="space-y-2">
      {entries.map(([competitor, value]) => {
        const pct = typeof value === 'number' && value <= 1 ? (value * 100).toFixed(1) : value;
        const barWidth = maxVal > 0 ? ((typeof value === 'number' ? value : 0) / maxVal) * 100 : 0;
        return (
          <div key={competitor} className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-28 truncate capitalize">{competitor}</span>
            <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400 w-12 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

function DataVoidsList({ voids }: { voids: any[] }) {
  if (!voids || voids.length === 0) return <p className="text-xs text-zinc-500">No data voids</p>;

  return (
    <div className="space-y-1.5">
      {voids.map((v, i) => {
        const topic = typeof v === 'string' ? v : v?.topic || v?.query || v?.keyword || JSON.stringify(v);
        const score = typeof v === 'object' ? v?.opportunity_score || v?.opportunityScore : null;
        return (
          <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded bg-zinc-800/50 border border-zinc-700/50">
            <span className="text-xs text-zinc-300">{topic}</span>
            {score !== null && score !== undefined && (
              <span className="text-[10px] text-yellow-400 px-1.5 py-0.5 rounded bg-yellow-500/10">
                {typeof score === 'number' && score <= 1 ? (score * 100).toFixed(0) : score}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReportCard({ report }: { report: AuditReport }) {
  const [expanded, setExpanded] = useState(false);
  const [showResults, setShowResults] = useState(false);

  return (
    <>
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 overflow-hidden">
        {/* Header row */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <BarChart3 className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-zinc-200 truncate">{report.runId}</span>
                <span className="text-[10px] uppercase text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-700">
                  {report.region}
                </span>
                <SomBadge value={report.shareOfModel} />
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(report.createdAt)}
                </span>
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {report.totalPrompts} prompts / {report.totalResponses} responses
                </span>
                {report.successRate > 0 && (
                  <span className="text-[11px] text-green-400">
                    {(typeof report.successRate === 'number' && report.successRate <= 1
                      ? (report.successRate * 100).toFixed(0)
                      : report.successRate
                    )}% success
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowResults(true);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-400 hover:bg-blue-500/10 transition-colors"
            >
              <Eye className="w-3 h-3" />
              View Results
            </button>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            )}
          </div>
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="p-3 pt-0 space-y-4 border-t border-zinc-700/50">
            {/* Platform Breakdown */}
            {report.platformBreakdown && Object.keys(report.platformBreakdown).length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                  Platform Breakdown
                </h5>
                <PlatformBreakdownTable breakdown={report.platformBreakdown} />
              </div>
            )}

            {/* Competitor Share */}
            {report.competitorShare && Object.keys(report.competitorShare).length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                  Competitor Share
                </h5>
                <CompetitorShareChart share={report.competitorShare} />
              </div>
            )}

            {/* Data Voids */}
            {report.dataVoids && report.dataVoids.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                  Data Voids ({report.dataVoids.length})
                </h5>
                <DataVoidsList voids={report.dataVoids} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Modal */}
      {showResults && (
        <AuditResultsModal
          runId={report.runId}
          onClose={() => setShowResults(false)}
        />
      )}
    </>
  );
}

export function AuditReportsSection({ reports }: AuditReportsSectionProps) {
  if (reports.length === 0) {
    return <p className="p-4 text-center text-sm text-zinc-500">No audit reports available.</p>;
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </div>
  );
}
