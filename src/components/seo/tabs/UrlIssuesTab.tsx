'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ExternalLink, Globe, ChevronDown, ChevronRight, Loader2, Download } from 'lucide-react';
import { getSeverityColor } from '@/lib/utils';

interface UrlIssue {
  issue_type: string;
  severity: string;
  category: string;
  description: string;
  recommendation?: string;
  current_value?: string;
  expected_value?: string;
  status?: string;
}

interface UrlEntry {
  crawl?: {
    status_code?: number;
    title?: string;
    is_indexable?: boolean;
    response_time_ms?: number;
    word_count?: number;
  };
  gsc?: {
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
    is_indexed?: boolean;
  } | null;
  issues: UrlIssue[];
}

type UrlData = Record<string, UrlEntry>;

interface UrlIssuesTabProps {
  auditId?: string | null;
  gcsPath?: string | null;
}

function UrlIssuesSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="h-4 w-64 bg-zinc-700 rounded" />
          <div className="flex gap-3">
            <div className="h-3 w-16 bg-zinc-700 rounded" />
            <div className="h-3 w-16 bg-zinc-700 rounded" />
            <div className="h-3 w-16 bg-zinc-700 rounded" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-28 bg-zinc-700 rounded-lg" />
        <div className="h-8 w-36 bg-zinc-700 rounded-lg" />
        <div className="h-8 flex-1 bg-zinc-700 rounded-lg" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-zinc-700 p-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-zinc-700 rounded" />
            <div className="h-4 flex-1 bg-zinc-700 rounded" />
            <div className="h-4 w-10 bg-zinc-700 rounded" />
            <div className="h-4 w-16 bg-zinc-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UrlIssuesTab({ auditId, gcsPath }: UrlIssuesTabProps) {
  const [urlData, setUrlData] = useState<UrlData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [expandedUrls, setExpandedUrls] = useState<Set<string>>(new Set());
  const [onlyWithIssues, setOnlyWithIssues] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showExportMenu]);

  // Fetch URL issues on mount (when tab is first shown)
  useEffect(() => {
    if (hasFetched || !auditId || !gcsPath) return;

    setIsLoading(true);
    setError(null);
    setHasFetched(true);

    fetch(`/api/seo/audits/${encodeURIComponent(auditId)}/url-issues`)
      .then(async (res) => {
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: 'Failed to load' }));
          throw new Error(errBody.error || 'Failed to load URL issues');
        }
        return res.json();
      })
      .then((data) => {
        setUrlData(data.urls ?? null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load URL issues');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [auditId, gcsPath, hasFetched]);

  const toggleUrl = (url: string) => {
    setExpandedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const filteredUrls = useMemo(() => {
    if (!urlData) return [];

    const q = searchQuery.toLowerCase();

    return Object.entries(urlData)
      .filter(([url, entry]) => {
        if (onlyWithIssues && entry.issues.length === 0) return false;

        const matchesSearch = !q || url.toLowerCase().includes(q) ||
          entry.issues.some((i) =>
            i.issue_type.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q)
          );

        const matchesSeverity = severityFilter === 'all' ||
          entry.issues.some((i) => i.severity === severityFilter);

        return matchesSearch && matchesSeverity;
      })
      .sort((a, b) => {
        const aCrit = a[1].issues.filter((i) => i.severity === 'critical').length;
        const bCrit = b[1].issues.filter((i) => i.severity === 'critical').length;
        if (aCrit !== bCrit) return bCrit - aCrit;
        return b[1].issues.length - a[1].issues.length;
      });
  }, [urlData, searchQuery, severityFilter, onlyWithIssues]);

  const stats = useMemo(() => {
    if (!urlData) return null;
    const entries = Object.values(urlData);
    const totalUrls = entries.length;
    const urlsWithIssues = entries.filter((e) => e.issues.length > 0).length;
    const totalIssues = entries.reduce((sum, e) => sum + e.issues.length, 0);
    const bySeverity: Record<string, number> = {};
    entries.forEach((e) =>
      e.issues.forEach((i) => {
        bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
      })
    );
    return { totalUrls, urlsWithIssues, totalIssues, bySeverity };
  }, [urlData]);

  const exportUrlIssues = (format: 'json' | 'txt') => {
    const data = filteredUrls.map(([url, entry]) => {
      const issues =
        severityFilter === 'all'
          ? entry.issues
          : entry.issues.filter((i) => i.severity === severityFilter);
      return {
        url,
        status_code: entry.crawl?.status_code ?? null,
        title: entry.crawl?.title ?? null,
        is_indexable: entry.crawl?.is_indexable ?? null,
        response_time_ms: entry.crawl?.response_time_ms ?? null,
        issues: issues.map((i) => ({
          severity: i.severity,
          category: i.category,
          issue_type: i.issue_type,
          description: i.description,
          recommendation: i.recommendation || '',
        })),
      };
    });

    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      content = data
        .map((entry) => {
          const header =
            `URL: ${entry.url}\n` +
            `Status: ${entry.status_code ?? 'N/A'}\n` +
            `Title: ${entry.title ?? 'N/A'}\n` +
            `Indexable: ${entry.is_indexable ?? 'N/A'}\n` +
            `Response Time: ${entry.response_time_ms != null ? entry.response_time_ms + 'ms' : 'N/A'}\n` +
            `Issues (${entry.issues.length}):`;
          const issueLines = entry.issues
            .map(
              (issue, i) =>
                `  ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.issue_type}\n` +
                `     ${issue.description}\n` +
                `     Recommendation: ${issue.recommendation || 'N/A'}`
            )
            .join('\n');
          return header + '\n' + (issueLines || '  No issues');
        })
        .join('\n\n---\n\n');
      mimeType = 'text/plain';
      extension = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `url_issues_export.${extension}`;
    a.click();
    URL.revokeObjectURL(downloadUrl);
    setShowExportMenu(false);
  };

  // Loading state
  if (isLoading) {
    return <UrlIssuesSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-sm font-medium text-zinc-400 mb-1">Failed to Load URL Data</h3>
          <p className="text-xs text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  // No GCS path
  if (!gcsPath || !auditId) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-7 h-7 text-zinc-600" />
          </div>
          <h3 className="text-sm font-medium text-zinc-400 mb-1">No URL Data Available</h3>
          <p className="text-xs text-zinc-500">
            No GCS report found for this audit. URL-level data is only available when reports are stored in GCS.
          </p>
        </div>
      </div>
    );
  }

  // No data after fetch
  if (!urlData) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-7 h-7 text-zinc-600" />
          </div>
          <h3 className="text-sm font-medium text-zinc-400 mb-1">No URL Data Available</h3>
          <p className="text-xs text-zinc-500">
            This audit report does not contain per-URL data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Banner */}
      {stats && (
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">
              <span className="font-semibold text-zinc-100">{stats.urlsWithIssues.toLocaleString()}</span>
              {' '}of{' '}
              <span className="font-semibold text-zinc-100">{stats.totalUrls.toLocaleString()}</span>
              {' '}URLs have issues ({stats.totalIssues.toLocaleString()} total)
            </div>
            <div className="flex items-center gap-3 text-xs">
              {Object.entries(stats.bySeverity)
                .sort(([a], [b]) => {
                  const order = ['critical', 'high', 'medium', 'low', 'info'];
                  return order.indexOf(a) - order.indexOf(b);
                })
                .map(([severity, count]) => (
                  <span key={severity} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${
                      severity === 'critical' ? 'bg-red-500' :
                      severity === 'high' ? 'bg-orange-500' :
                      severity === 'medium' ? 'bg-amber-500' :
                      severity === 'low' ? 'bg-blue-500' : 'bg-zinc-500'
                    }`} />
                    <span className="text-zinc-400 capitalize">{severity}:</span>
                    <span className="text-zinc-300">{count.toLocaleString()}</span>
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <label className="flex items-center gap-1.5 text-sm text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyWithIssues}
            onChange={(e) => setOnlyWithIssues(e.target.checked)}
            className="rounded bg-zinc-800 border-zinc-700"
          />
          Only URLs with issues
        </label>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search URLs or issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Export Button */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setShowExportMenu((prev) => !prev)}
            disabled={filteredUrls.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg overflow-hidden min-w-[140px]">
              <button
                onClick={() => exportUrlIssues('json')}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                Export as JSON
              </button>
              <button
                onClick={() => exportUrlIssues('txt')}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                Export as TXT
              </button>
            </div>
          )}
        </div>
      </div>

      {/* URL List */}
      <div className="space-y-1">
        {filteredUrls.map(([url, entry]) => {
          const isExpanded = expandedUrls.has(url);
          const critCount = entry.issues.filter((i) => i.severity === 'critical').length;
          const highCount = entry.issues.filter((i) => i.severity === 'high').length;

          const displayIssues = severityFilter === 'all'
            ? entry.issues
            : entry.issues.filter((i) => i.severity === severityFilter);

          return (
            <div key={url} className="rounded-lg border border-zinc-700 overflow-hidden">
              {/* URL Header */}
              <button
                onClick={() => toggleUrl(url)}
                className="w-full flex items-center gap-2 p-3 text-left hover:bg-zinc-800/50 transition-colors"
              >
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                }

                <span className="text-sm text-zinc-300 truncate flex-1" title={url}>
                  {url}
                </span>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.crawl?.status_code && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      entry.crawl.status_code >= 400 ? 'bg-red-500/10 text-red-400' :
                      entry.crawl.status_code >= 300 ? 'bg-amber-500/10 text-amber-400' :
                      'bg-green-500/10 text-green-400'
                    }`}>
                      {entry.crawl.status_code}
                    </span>
                  )}
                  {critCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium">
                      {critCount} critical
                    </span>
                  )}
                  {highCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-medium">
                      {highCount} high
                    </span>
                  )}
                  <span className="text-xs text-zinc-500">
                    {entry.issues.length} issue{entry.issues.length !== 1 ? 's' : ''}
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-blue-400"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </button>

              {/* Expanded Issues */}
              {isExpanded && (
                <div className="border-t border-zinc-700/50">
                  {/* URL Meta Info */}
                  <div className="px-4 py-2 bg-zinc-800/30 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    {entry.crawl?.title && (
                      <span>Title: <span className="text-zinc-400">{entry.crawl.title}</span></span>
                    )}
                    {entry.crawl?.response_time_ms != null && (
                      <span>Response: <span className="text-zinc-400">{entry.crawl.response_time_ms}ms</span></span>
                    )}
                    {entry.crawl?.word_count != null && (
                      <span>Words: <span className="text-zinc-400">{entry.crawl.word_count}</span></span>
                    )}
                    {entry.gsc?.clicks != null && (
                      <span>Clicks: <span className="text-zinc-400">{entry.gsc.clicks}</span></span>
                    )}
                    {entry.gsc?.impressions != null && (
                      <span>Impressions: <span className="text-zinc-400">{entry.gsc.impressions}</span></span>
                    )}
                    {entry.gsc?.position != null && (
                      <span>Avg Position: <span className="text-zinc-400">{entry.gsc.position.toFixed(1)}</span></span>
                    )}
                    {entry.crawl?.is_indexable != null && (
                      <span>Indexable: <span className={entry.crawl.is_indexable ? 'text-green-400' : 'text-red-400'}>{entry.crawl.is_indexable ? 'Yes' : 'No'}</span></span>
                    )}
                  </div>

                  {/* Issues Table */}
                  {displayIssues.length > 0 ? (
                    <table className="w-full data-table">
                      <thead className="bg-zinc-800/50">
                        <tr>
                          <th>Severity</th>
                          <th>Category</th>
                          <th>Type</th>
                          <th>Description</th>
                          <th>Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayIssues.map((issue, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className={`px-2 py-0.5 rounded text-xs uppercase font-medium ${getSeverityColor(issue.severity)}`}>
                                {issue.severity}
                              </span>
                            </td>
                            <td className="text-zinc-400 text-sm">{issue.category}</td>
                            <td className="text-zinc-300 text-sm">{issue.issue_type}</td>
                            <td className="text-zinc-400 text-sm max-w-[300px]">{issue.description}</td>
                            <td className="text-zinc-400 text-sm max-w-[300px]">{issue.recommendation || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-4 py-3 text-sm text-zinc-500">
                      No issues matching current filters
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-xs text-zinc-500 text-center">
        Showing {filteredUrls.length} of {Object.keys(urlData).length} URLs
      </div>
    </div>
  );
}
