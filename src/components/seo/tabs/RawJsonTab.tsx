'use client';

import { useState } from 'react';
import { Copy, Download, FileDown, Loader2 } from 'lucide-react';
import { AuditReport } from '@/types/seo';
import { JsonView, darkStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

interface RawJsonTabProps {
  report: AuditReport | null;
  gcsPath?: string | null;
  auditId?: string | null;
  isLoading?: boolean;
}

function RawJsonSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-zinc-700 rounded" />
        <div className="flex gap-2">
          <div className="h-7 w-16 bg-zinc-700 rounded-lg" />
          <div className="h-7 w-28 bg-zinc-700 rounded-lg" />
          <div className="h-7 w-32 bg-zinc-700 rounded-lg" />
        </div>
      </div>
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 space-y-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <div className="h-3 bg-zinc-700 rounded" style={{ width: `${20 + Math.random() * 60}%` }} />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <div className="h-3 w-48 bg-zinc-700 rounded" />
        <div className="h-3 w-24 bg-zinc-700 rounded" />
      </div>
    </div>
  );
}

export function RawJsonTab({ report, gcsPath, auditId, isLoading = false }: RawJsonTabProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (isLoading || !report) {
    return <RawJsonSkeleton />;
  }

  const jsonString = JSON.stringify(report, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
  };

  const handleDownloadSummary = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_summary_${report.summary.audit_date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFull = async () => {
    if (!auditId) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch(`/api/seo/audits/${encodeURIComponent(auditId)}/download`);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      a.download = filenameMatch?.[1] || `audit_full_${auditId}.json`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const fileSizeKB = Math.round(jsonString.length / 1024);
  const fileSizeDisplay = fileSizeKB > 1024
    ? `${(fileSizeKB / 1024).toFixed(1)} MB`
    : `${fileSizeKB} KB`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
          Raw JSON
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
          <button
            onClick={handleDownloadSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
          >
            <Download className="w-3 h-3" />
            Download Summary
          </button>
          {gcsPath && auditId && (
            <button
              onClick={handleDownloadFull}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
            >
              {isDownloading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <FileDown className="w-3 h-3" />
              )}
              Download Full Report
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {downloadError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {downloadError}
        </div>
      )}

      {/* JSON Viewer */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
        <div className="max-h-[calc(100vh-400px)] overflow-auto p-4">
          <JsonView
            data={report}
            style={{
              ...darkStyles,
              container: 'json-view',
            }}
          />
        </div>
      </div>

      {/* File Info */}
      <div className="text-xs text-zinc-500">
        <p>Viewing: Summary (URLs stripped for performance)</p>
        <p>Size: ~{fileSizeDisplay}</p>
        {gcsPath && <p>GCS: {gcsPath}</p>}
        {gcsPath && (
          <p className="text-zinc-400 mt-1">
            Use &quot;Download Full Report&quot; to get the complete report including all URL-level data.
          </p>
        )}
      </div>
    </div>
  );
}
