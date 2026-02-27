'use client';

import { useState, useEffect, useCallback } from 'react';
import { Ticket, Loader2, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Users, Wrench } from 'lucide-react';

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

interface TicketsData {
  status: 'not_generated' | 'complete';
  auditId?: string;
  domain?: string;
  auditDate?: string;
  createdAt?: string;
  ticketsCreated?: number;
  tickets?: JiraTicketResult[];
  failures?: TicketFailure[];
  gcsPath?: string;
}

interface TicketsTabProps {
  auditId?: string | null;
  existingTicketsGcsPath?: string | null;
}

const JIRA_BASE_URL = 'https://printerpix.atlassian.net';

export function TicketsTab({ auditId, existingTicketsGcsPath }: TicketsTabProps) {
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [ticketsData, setTicketsData] = useState<TicketsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTeam, setActiveTeam] = useState<'all' | 'Tech Team' | 'Data Team'>('all');

  // Load existing tickets on mount if we already have a GCS path
  const loadTickets = useCallback(async () => {
    if (!auditId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/seo/audits/${encodeURIComponent(auditId)}/tickets/results`);
      const data = await res.json();
      setTicketsData(data);
    } catch {
      // Silently fail — user can click Generate
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    if (existingTicketsGcsPath || auditId) {
      loadTickets();
    }
  }, [existingTicketsGcsPath, auditId, loadTickets]);

  async function handleGenerate() {
    if (!auditId) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/seo/audits/${encodeURIComponent(auditId)}/tickets`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error);
      // Reload ticket results after generation
      await loadTickets();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  if (!auditId) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
        Select an audit to manage Jira tickets.
      </div>
    );
  }

  const tickets = ticketsData?.tickets ?? [];
  const failures = ticketsData?.failures ?? [];
  const hasTickets = tickets.length > 0;
  const hasFailures = failures.length > 0;
  const isGenerated = ticketsData?.status === 'complete';

  const filteredTickets =
    activeTeam === 'all'
      ? tickets
      : tickets.filter((t) => t.team === activeTeam);

  const techCount = tickets.filter((t) => t.team === 'Tech Team').length;
  const dataCount = tickets.filter((t) => t.team === 'Data Team').length;

  type TeamFilter = 'all' | 'Tech Team' | 'Data Team';

  const teamOptions: Array<{ value: TeamFilter; label: string; icon: React.ReactNode }> = [
    { value: 'all', label: `All (${tickets.length})`, icon: null },
    { value: 'Tech Team', label: `Tech Team (${techCount})`, icon: <Wrench className="w-3 h-3" /> },
    { value: 'Data Team', label: `Data Team (${dataCount})`, icon: <Users className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-blue-400" />
            Jira Tickets
          </h3>
          {isGenerated && ticketsData.createdAt && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Generated {new Date(ticketsData.createdAt).toLocaleString()} ·{' '}
              {ticketsData.ticketsCreated} tickets created
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isGenerated && (
            <button
              onClick={loadTickets}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-xs text-zinc-300 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}

          {!isGenerated && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating tickets… (may take 5–10 min)
                </>
              ) : (
                <>
                  <Ticket className="w-3 h-3" />
                  Generate Jira Tickets
                </>
              )}
            </button>
          )}
        </div>
      </div>

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
      {loading && !ticketsData && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Not generated yet ───────────────────────────────────────────── */}
      {!loading && !isGenerated && !generating && !generateError && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <Ticket className="w-10 h-10 text-zinc-600" />
          <p className="text-sm text-zinc-400">No Jira tickets have been generated for this audit yet.</p>
          <p className="text-xs text-zinc-500 max-w-md">
            Generating tickets classifies each issue group (Frontend / API Data), drafts a structured ticket,
            and creates it in the ENG board automatically.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
          >
            <Ticket className="w-4 h-4" />
            Generate Tickets
          </button>
        </div>
      )}

      {/* ── Generating in progress ──────────────────────────────────────── */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-sm text-zinc-300">Classifying issues and creating Jira tickets…</p>
          <p className="text-xs text-zinc-500">
            Each issue group is classified using the ecommerce spec files, then pushed to the ENG board.
            This typically takes 5–10 minutes for a full audit.
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
          <p className="text-xs text-zinc-500">
            To retry failed tickets, fix the error above and re-run generation (note: idempotency
            is set — you will need to clear the{' '}
            <code className="text-zinc-400">jira_tickets_gcs_path</code> column in BigQuery first).
          </p>
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
