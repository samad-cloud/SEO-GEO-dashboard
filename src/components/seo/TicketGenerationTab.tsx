'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Ticket,
  Loader2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  Wrench,
  Globe,
  Calendar,
} from 'lucide-react';

interface JiraTicketResult {
  issueKey: string;
  jiraUrl: string;
  issueType: string;
  team: 'Tech Team' | 'Data Team';
  attachmentCreated: boolean;
}

interface TicketFailure {
  issueType: string;
  error: string;
}

interface TicketsApiResponse {
  status: 'not_generated' | 'complete' | 'exists' | 'running';
  latestDate?: string;
  runDate?: string;
  runId?: string;
  gcsPath?: string;
  createdAt?: string;
  ticketsCreated?: number;
  tickets?: JiraTicketResult[];
  failures?: TicketFailure[];
}

const JIRA_BASE_URL = 'https://printerpix.atlassian.net';

type TeamFilter = 'all' | 'Tech Team' | 'Data Team';

export function TicketGenerationTab() {
  const [data, setData] = useState<TicketsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [activeTeam, setActiveTeam] = useState<TeamFilter>('all');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback((expectedRunId?: string) => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/seo/tickets');
        const json = (await res.json()) as TicketsApiResponse;
        const isExpectedRun = !expectedRunId || json.runId === expectedRunId || json.runDate === expectedRunId;
        if ((json.status === 'complete' || json.status === 'exists') && isExpectedRun) {
          stopPolling();
          setData(json);
          setGenerating(false);
        }
      } catch {
        // keep polling
      }
    }, 6000);
  }, [stopPolling]);

  // Clean up interval on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seo/tickets');
      const json = (await res.json()) as TicketsApiResponse;
      setData(json);
      if (json.status === 'running') {
        setGenerating(true);
        startPolling();
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [startPolling]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/seo/tickets', { method: 'POST' });
      const text = await res.text();

      // Parse safely — non-JSON responses (e.g. Vercel timeout pages) should not crash the UI
      let json: TicketsApiResponse & { error?: string; details?: string };
      try {
        json = JSON.parse(text) as typeof json;
      } catch {
        throw new Error(
          res.ok
            ? 'Unexpected server response (not JSON)'
            : `Server error ${res.status}: ${text.slice(0, 200)}`
        );
      }

      if (!res.ok) {
        throw new Error(json.details || json.error || `Server error ${res.status}`);
      }

      if (json.status === 'running') {
        // Pipeline started in background — poll GET until the specific run completes
        startPolling(json.runId);
        return; // keep generating=true
      }
      if (json.status === 'exists') {
        await loadStatus();
      } else {
        setData(json);
      }
      setGenerating(false);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err));
      setGenerating(false);
    }
  }

  const isGenerated = data?.status === 'complete' || data?.status === 'exists';
  const tickets = data?.tickets ?? [];
  const failures = data?.failures ?? [];
  const hasTickets = tickets.length > 0;
  const hasFailures = failures.length > 0;

  const filteredTickets =
    activeTeam === 'all' ? tickets : tickets.filter((t) => t.team === activeTeam);

  const techCount = tickets.filter((t) => t.team === 'Tech Team').length;
  const dataCount = tickets.filter((t) => t.team === 'Data Team').length;

  const teamOptions: Array<{ value: TeamFilter; label: string; icon: React.ReactNode }> = [
    { value: 'all', label: `All (${tickets.length})`, icon: null },
    { value: 'Tech Team', label: `Tech Team (${techCount})`, icon: <Wrench className="w-3 h-3" /> },
    { value: 'Data Team', label: `Data Team (${dataCount})`, icon: <Users className="w-3 h-3" /> },
  ];

  // Latest audit date for display — available from both GET states
  const latestAuditDate = data?.latestDate ?? data?.runDate ?? null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-blue-400" />
            Cross-Domain Ticket Generation
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Fetches the latest audits across all domains, merges identical issues into single tickets,
            classifies each, and creates them in the ENG board.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Latest audit date badge — always shown once data loads */}
          {latestAuditDate && !generating && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Latest audit:{' '}
                <span className="text-zinc-300 font-mono">{latestAuditDate}</span>
              </span>
            </div>
          )}

          {/* Refresh — shown when results exist */}
          {isGenerated && !generating && (
            <button
              onClick={loadStatus}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-xs text-zinc-300 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}

          {/* Generate — always visible, primary when no results, secondary when results exist */}
          {!generating && (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isGenerated
                  ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200 border border-zinc-600'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <Ticket className="w-4 h-4" />
              {isGenerated ? 'Run for Latest Audits' : 'Generate Tickets'}
            </button>
          )}
        </div>
      </div>

      {/* ── Run metadata (shown after generation) ───────────────────────── */}
      {isGenerated && data?.runDate && (
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              Last run:{' '}
              <span className="text-zinc-300 font-mono">{data.runDate}</span>
            </span>
          </div>
          {data.createdAt && (
            <span>· {new Date(data.createdAt).toLocaleString()}</span>
          )}
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>{data.ticketsCreated} tickets created</span>
          </div>
        </div>
      )}

      {/* ── Generate error ──────────────────────────────────────────────── */}
      {generateError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Generation failed</p>
            <p className="mt-1 text-red-400">{generateError}</p>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ────────────────────────────────────────────── */}
      {loading && !data && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Not generated yet (empty state, no button — it's in the header) */}
      {!loading && !isGenerated && !generating && !generateError && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Ticket className="w-12 h-12 text-zinc-600" />
          <p className="text-sm text-zinc-400">No tickets generated yet.</p>
          <p className="text-xs text-zinc-500 max-w-lg">
            Click <span className="text-zinc-300 font-medium">Generate Tickets</span> above to fetch
            the latest audit results across all domains, classify each issue, and create Jira tickets
            in the ENG board.
          </p>
        </div>
      )}

      {/* ── Generating in progress ──────────────────────────────────────── */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          <p className="text-sm text-zinc-300">Running agents on latest audit data…</p>
          <p className="text-xs text-zinc-500 max-w-lg text-center">
            Downloading audits from all domains, merging issues, classifying, reviewing risks, and
            creating Jira tickets. This typically takes 5–15 minutes.
          </p>
        </div>
      )}

      {/* ── Ticket list ─────────────────────────────────────────────────── */}
      {isGenerated && hasTickets && (
        <div className="space-y-4">
          {/* Team filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Filter by team:</span>
            {teamOptions.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setActiveTeam(value)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  activeTeam === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Ticket cards */}
          <div className="space-y-2">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.issueKey}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 border border-zinc-700 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-400">
                        {ticket.issueKey}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          ticket.team === 'Tech Team'
                            ? 'bg-purple-900/60 text-purple-300'
                            : 'bg-amber-900/60 text-amber-300'
                        }`}
                      >
                        {ticket.team}
                      </span>
                      {ticket.attachmentCreated && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-zinc-700 text-zinc-400">
                          CSV attached
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {ticket.issueType.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                <a
                  href={ticket.jiraUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-300 transition-colors flex-shrink-0 ml-3"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in Jira
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── No tickets but generated ─────────────────────────────────────── */}
      {isGenerated && !hasTickets && !hasFailures && (
        <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
          No tickets were created for this run.
        </div>
      )}

      {/* ── Failures section ────────────────────────────────────────────── */}
      {isGenerated && hasFailures && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Failed ({failures.length})
          </h4>
          <div className="space-y-2">
            {failures.map((failure, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-red-950/40 border border-red-900 text-xs"
              >
                <p className="font-medium text-red-300">
                  {failure.issueType.replace(/_/g, ' ')}
                </p>
                <p className="text-red-500 mt-1 font-mono">{failure.error}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── View in Jira board ──────────────────────────────────────────── */}
      {isGenerated && (
        <div className="pt-2 border-t border-zinc-800">
          <a
            href={`${JIRA_BASE_URL}/jira/software/c/projects/ENG/boards/247`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Open ENG board in Jira
          </a>
        </div>
      )}
    </div>
  );
}
