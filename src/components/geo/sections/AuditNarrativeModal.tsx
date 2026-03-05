'use client';

import { useState } from 'react';
import { FileText, X, Download, Loader2 } from 'lucide-react';

interface AuditNarrativeModalProps {
  runId: string;
  region: string;
}

export function AuditNarrativeButton({ runId, region }: AuditNarrativeModalProps) {
  const [open, setOpen] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (narrative) { setOpen(true); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/geo/audit/reports/${runId}/narrative`);
      if (!res.ok) throw new Error('Narrative not available');
      const data = await res.json();
      setNarrative(data.narrative);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!narrative) return;
    const blob = new Blob([narrative], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${region}-${runId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button
        onClick={load}
        disabled={loading}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
        {loading ? 'Loading...' : 'View Report'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}

      {open && narrative && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-zinc-900 rounded-xl border border-zinc-700 shadow-2xl my-8">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">Audit Narrative Report</h2>
              <div className="flex items-center gap-2">
                <button onClick={download} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-800">
                  <Download className="w-3 h-3" /> Download .md
                </button>
                <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-sans leading-relaxed">
                {narrative}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
