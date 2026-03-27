'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, CheckSquare, Square, AlertTriangle, CheckCircle } from 'lucide-react';
import { fetchDomainGroups, triggerAuditJobs } from '@/lib/api/seo-jobs-api';
import type { DomainGroup } from '@/lib/api/seo-jobs-api';

interface RunAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggered: () => void;
}

export function RunAuditModal({ isOpen, onClose, onTriggered }: RunAuditModalProps) {
  const [groups, setGroups] = useState<DomainGroup[]>([]);
  const [allDomains, setAllDomains] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [skipAi, setSkipAi] = useState(false);
  const [skipEmail, setSkipEmail] = useState(false);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDomains = useCallback(async () => {
    setIsLoadingDomains(true);
    setError(null);
    try {
      const data = await fetchDomainGroups();
      setGroups(data.groups);
      setAllDomains(data.all);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domains');
    } finally {
      setIsLoadingDomains(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedDomains(new Set());
      setSkipAi(false);
      setSkipEmail(false);
      setConflict(false);
      setSuccess(false);
      setError(null);
      loadDomains();
    }
  }, [isOpen, loadDomains]);

  const isGroupFullySelected = (group: DomainGroup) =>
    group.domains.every((d) => selectedDomains.has(d));

  const isGroupPartiallySelected = (group: DomainGroup) =>
    group.domains.some((d) => selectedDomains.has(d)) && !isGroupFullySelected(group);

  const toggleGroup = (group: DomainGroup) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      if (isGroupFullySelected(group)) {
        group.domains.forEach((d) => next.delete(d));
      } else {
        group.domains.forEach((d) => next.add(d));
      }
      return next;
    });
  };

  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedDomains.size === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setConflict(false);
    setError(null);

    try {
      await triggerAuditJobs({
        domains: Array.from(selectedDomains),
        skipAi,
        skipEmail,
      });
      setSuccess(true);
      onTriggered();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to trigger audit';
      if (message.toLowerCase().includes('already running') || message.includes('409')) {
        setConflict(true);
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg mx-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <h2 className="text-sm font-semibold text-zinc-200">Run SEO Audit</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Domain selection */}
          {isLoadingDomains ? (
            <div className="flex items-center justify-center py-8 gap-2 text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading domains...</span>
            </div>
          ) : error && groups.length === 0 ? (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                  Select Domains
                </span>
                <span className="text-xs text-zinc-500">
                  {selectedDomains.size} of {allDomains.length} selected
                </span>
              </div>

              {groups.map((group) => {
                const fullySelected = isGroupFullySelected(group);
                const partiallySelected = isGroupPartiallySelected(group);

                return (
                  <div key={group.job} className="space-y-1.5">
                    {/* Group header toggle */}
                    <button
                      onClick={() => toggleGroup(group)}
                      className="flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors group"
                    >
                      <span
                        className={`w-4 h-4 flex-shrink-0 ${
                          fullySelected
                            ? 'text-blue-400'
                            : partiallySelected
                            ? 'text-blue-400/60'
                            : 'text-zinc-600'
                        }`}
                      >
                        {fullySelected ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </span>
                      <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-200">
                        Select All {group.label}
                      </span>
                      <span className="text-xs text-zinc-600 ml-auto">
                        {group.domains.filter((d) => selectedDomains.has(d)).length}/
                        {group.domains.length}
                      </span>
                    </button>

                    {/* Individual domains */}
                    <div className="ml-6 space-y-1">
                      {group.domains.map((domain) => {
                        const checked = selectedDomains.has(domain);
                        return (
                          <button
                            key={domain}
                            onClick={() => toggleDomain(domain)}
                            className="flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-lg hover:bg-zinc-800/70 transition-colors"
                          >
                            <span
                              className={`w-4 h-4 flex-shrink-0 ${
                                checked ? 'text-blue-400' : 'text-zinc-600'
                              }`}
                            >
                              {checked ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </span>
                            <span
                              className={`text-sm ${
                                checked ? 'text-zinc-200' : 'text-zinc-400'
                              }`}
                            >
                              {domain}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Options */}
          {!isLoadingDomains && groups.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide block pt-3">
                Options
              </span>
              <button
                onClick={() => setSkipAi((v) => !v)}
                className="flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-lg hover:bg-zinc-800/70 transition-colors"
              >
                <span className={`w-4 h-4 flex-shrink-0 ${skipAi ? 'text-blue-400' : 'text-zinc-600'}`}>
                  {skipAi ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </span>
                <span className="text-sm text-zinc-300">Skip AI Analysis</span>
              </button>
              <button
                onClick={() => setSkipEmail((v) => !v)}
                className="flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-lg hover:bg-zinc-800/70 transition-colors"
              >
                <span className={`w-4 h-4 flex-shrink-0 ${skipEmail ? 'text-blue-400' : 'text-zinc-600'}`}>
                  {skipEmail ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </span>
                <span className="text-sm text-zinc-300">Skip Email Notifications</span>
              </button>
            </div>
          )}

          {/* Conflict warning */}
          {conflict && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="text-sm">
                An audit is already running. Please wait for it to complete.
              </span>
            </div>
          )}

          {/* Generic error */}
          {error && !conflict && groups.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Audit started!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedDomains.size === 0 || isSubmitting || success}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting audit...
              </>
            ) : (
              'Run Audit'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
