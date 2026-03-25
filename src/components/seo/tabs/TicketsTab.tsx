'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Ticket, Loader2, ExternalLink, RefreshCw, AlertCircle,
  CheckCircle2, Users, Wrench, Upload, Clock,
} from 'lucide-react';
import type { TicketRow } from '@/lib/supabase/tickets';

interface TicketsTabProps {
  auditId?: string | null;
  existingTicketsGcsPath?: string | null;
}

type TeamFilter = 'all' | 'Tech Team' | 'Data Team';

const JIRA_BOARD_URL = 'https://printerpix.atlassian.net/jira/software/c/projects/ENG/boards/247';

export function TicketsTab({ auditId, existingTicketsGcsPath: _existingTicketsGcsPath }: TicketsTabProps) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());
  const [publishAllLoading, setPublishAllLoading] = useState(false);
  const [activeTeam, setActiveTeam] = useState<TeamFilter>('all');

  const loadTickets = useCallback(async () => {
    if (!auditId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets?auditId=${encodeURIComponent(auditId)}`);
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } catch {
      // silent — user can re-generate
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    if (auditId) loadTickets();
  }, [auditId, loadTickets]);

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
      await loadTickets();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublishOne(id: string) {
    setPublishingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/tickets/${id}/publish-to-jira`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error);
      // Update ticket in local state
      setTickets((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, status: 'published', jira_issue_key: data.jiraIssueKey, jira_url: data.jiraUrl }
            : t
        )
      );
    } catch (err) {
      alert(`Failed to publish: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPublishingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handlePublishAll() {
    const drafts = tickets.filter((t) => t.status === 'draft');
    if (!drafts.length) return;
    setPublishAllLoading(true);
    for (const ticket of drafts) {
      await handlePublishOne(ticket.id);
    }
    setPublishAllLoading(false);
  }

  if (!auditId) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
        Select an audit to manage tickets.
      </div>
    );
  }

  const draftTickets = tickets.filter((t) => t.status === 'draft');
  const publishedTickets = tickets.filter((t) => t.status === 'published');
  const hasTickets = tickets.length > 0;

  const filtered =
    activeTeam === 'all'
      ? tickets
      : tickets.filter((t) => t.team === activeTeam);

  const techCount = tickets.filter((t) => t.team === 'Tech Team').length;
  const dataCount = tickets.filter((t) => t.team === 'Data Team').length;

  const teamOptions: Array<{ value: TeamFilter; label: string; icon: React.ReactNode }> = [
    { value: 'all', label: `All (${tickets.length})`, icon: null },
    { value: 'Tech Team', label: `Tech (${techCount})`, icon: <Wrench className="w-3 h-3" /> },
    { value: 'Data Team', label: `Data (${dataCount})`, icon: <Users className="w-3 h-3" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-blue-400" />
            Tickets
          </h3>
          {hasTickets && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {draftTickets.length} draft · {publishedTickets.length} published to Jira
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasTickets && (
            <button
              onClick={loadTickets}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-xs text-zinc-300 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}

          {draftTickets.length > 1 && (
            <button
              onClick={handlePublishAll}
              disabled={publishAllLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-xs text-white font-medium transition-colors"
            >
              {publishAllLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Upload className="w-3 h-3" />
              )}
              Publish All to Jira ({draftTickets.length})
            </button>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white transition-colors"
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ticket className="w-3 h-3" />}
            {hasTickets ? 'Re-generate' : 'Generate Tickets'}
          </button>
        </div>
      </div>

      {/* Error */}
      {generateError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950 border border-red-800 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Generation failed</p>
            <p className="mt-1 text-red-400">{generateError}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !hasTickets && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-zinc-800 animate-pulse" />
          ))}
        </div>
      )}

      {/* Generating */}
      {generating && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-sm text-zinc-300">Classifying issues and drafting tickets…</p>
          <p className="text-xs text-zinc-500">Typically 5–10 minutes. Tickets will appear here when ready.</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !generating && !hasTickets && !generateError && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <Ticket className="w-10 h-10 text-zinc-600" />
          <p className="text-sm text-zinc-400">No tickets generated for this audit yet.</p>
          <p className="text-xs text-zinc-500 max-w-md">
            Click <span className="text-zinc-300 font-medium">Generate Tickets</span> to classify each issue
            and draft structured tickets. You can then publish them to Jira manually.
          </p>
        </div>
      )}

      {/* Team filter */}
      {hasTickets && !generating && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Filter:</span>
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
      )}

      {/* Ticket list */}
      {!generating && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((ticket) => {
            const isPublishing = publishingIds.has(ticket.id);
            const isDraft = ticket.status === 'draft';

            return (
              <div
                key={ticket.id}
                className="p-3 rounded-lg bg-zinc-800 border border-zinc-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {isDraft ? (
                      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {ticket.jira_issue_key && (
                          <span className="text-xs font-mono font-bold text-blue-400">
                            {ticket.jira_issue_key}
                          </span>
                        )}
                        {ticket.team && (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            ticket.team === 'Tech Team'
                              ? 'bg-purple-900/60 text-purple-300'
                              : 'bg-amber-900/60 text-amber-300'
                          }`}>
                            {ticket.team}
                          </span>
                        )}
                        {ticket.priority && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-zinc-700 text-zinc-400">
                            {ticket.priority}
                          </span>
                        )}
                        {isDraft && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-zinc-700 text-zinc-500 italic">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-200 mt-1 leading-relaxed">
                        {ticket.objective ?? ticket.issue_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {ticket.affected_url_count > 0 && `${ticket.affected_url_count} URLs affected · `}
                        {ticket.category}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isDraft ? (
                      <button
                        onClick={() => handlePublishOne(ticket.id)}
                        disabled={isPublishing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs text-white font-medium transition-colors"
                      >
                        {isPublishing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3" />
                        )}
                        {isPublishing ? 'Publishing…' : 'Publish to Jira'}
                      </button>
                    ) : ticket.jira_url ? (
                      <a
                        href={ticket.jira_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-300 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open in Jira
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Jira board link */}
      {publishedTickets.length > 0 && (
        <div className="pt-2 border-t border-zinc-800">
          <a
            href={JIRA_BOARD_URL}
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
