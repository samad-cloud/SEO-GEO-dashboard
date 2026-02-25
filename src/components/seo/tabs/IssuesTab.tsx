'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ExternalLink, Ticket, Download } from 'lucide-react';
import { AuditReport, PriorityIssue, AllIssuesSummary } from '@/types/seo';
import { getSeverityColor } from '@/lib/utils';

interface IssuesTabProps {
  report: AuditReport;
}

export function IssuesTab({ report }: IssuesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedIssue, setSelectedIssue] = useState<PriorityIssue | null>(null);
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

  const domainReport = report.reports[0];
  const issues = domainReport?.priority_issues || [];
  const allIssuesSummary: AllIssuesSummary | undefined = domainReport?.all_issues_summary;

  const categories = [...new Set(issues.map((i) => i.category))];

  const filteredIssues = issues.filter((issue) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      issue.url.toLowerCase().includes(q) ||
      issue.issue_type.toLowerCase().includes(q) ||
      issue.description.toLowerCase().includes(q) ||
      (issue.recommendation?.toLowerCase().includes(q) ?? false);
    const matchesSeverity = severityFilter === 'all' || issue.severity === severityFilter;
    const matchesCategory = categoryFilter === 'all' || issue.category === categoryFilter;
    return matchesSearch && matchesSeverity && matchesCategory;
  });

  const exportIssues = (format: 'json' | 'txt') => {
    const data = filteredIssues.map((issue) => ({
      severity: issue.severity,
      category: issue.category,
      issue_type: issue.issue_type,
      url: issue.url,
      description: issue.description,
      recommendation: issue.recommendation || '',
      current_value: issue.current_value || '',
      expected_value: issue.expected_value || '',
    }));

    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      content = data
        .map(
          (issue, i) =>
            `Issue #${i + 1}\n` +
            `Severity: ${issue.severity}\n` +
            `Category: ${issue.category}\n` +
            `Type: ${issue.issue_type}\n` +
            `URL: ${issue.url}\n` +
            `Description: ${issue.description}\n` +
            `Recommendation: ${issue.recommendation || 'N/A'}\n` +
            `Current Value: ${issue.current_value || 'N/A'}\n` +
            `Expected Value: ${issue.expected_value || 'N/A'}`
        )
        .join('\n\n---\n\n');
      mimeType = 'text/plain';
      extension = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `issues_export.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-4">
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

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Export Button */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setShowExportMenu((prev) => !prev)}
            disabled={filteredIssues.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg overflow-hidden min-w-[140px]">
              <button
                onClick={() => exportIssues('json')}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                Export as JSON
              </button>
              <button
                onClick={() => exportIssues('txt')}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
              >
                Export as TXT
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Total Issues Summary Banner */}
      {allIssuesSummary && (
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-300">
              <span className="font-semibold text-zinc-100">
                {allIssuesSummary.total_count.toLocaleString()}
              </span>{' '}
              total issues across all URLs
            </div>
            <div className="flex items-center gap-3 text-xs">
              {Object.entries(allIssuesSummary.by_severity || {}).map(([severity, count]) => (
                <span key={severity} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${
                    severity === 'critical' ? 'bg-red-500' :
                    severity === 'high' ? 'bg-orange-500' :
                    severity === 'medium' ? 'bg-amber-500' :
                    'bg-blue-500'
                  }`} />
                  <span className="text-zinc-400 capitalize">{severity}:</span>
                  <span className="text-zinc-300">{count.toLocaleString()}</span>
                </span>
              ))}
            </div>
          </div>
          {allIssuesSummary.by_category && Object.keys(allIssuesSummary.by_category).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(allIssuesSummary.by_category).map(([category, count]) => (
                <span key={category} className="px-2 py-0.5 rounded bg-zinc-700/50 text-xs text-zinc-400">
                  {category}: {count.toLocaleString()}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Issues Table */}
      <div className="rounded-lg border border-zinc-700 overflow-hidden">
        <table className="w-full data-table">
          <thead className="bg-zinc-800/50">
            <tr>
              <th>Severity</th>
              <th>Category</th>
              <th>Type</th>
              <th>URL</th>
              <th>Description</th>
              <th>Recommendation</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredIssues.map((issue, index) => (
              <tr
                key={index}
                className={`cursor-pointer ${selectedIssue === issue ? 'bg-blue-500/10' : ''}`}
                onClick={() => setSelectedIssue(issue)}
              >
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs uppercase font-medium ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                </td>
                <td className="text-zinc-400 text-sm">{issue.category}</td>
                <td className="text-zinc-300 text-sm">{issue.issue_type}</td>
                <td className="text-zinc-400 text-sm max-w-[200px] truncate" title={issue.url}>{issue.url}</td>
                <td className="text-zinc-400 text-sm max-w-[250px]">
                  <span className="line-clamp-2">{issue.description}</span>
                </td>
                <td className="text-zinc-400 text-sm max-w-[250px]">
                  <span className="line-clamp-2">{issue.recommendation || '-'}</span>
                </td>
                <td>
                  <button className="text-blue-400 hover:text-blue-300 text-sm">
                    [View]
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Issue Detail Panel */}
      {selectedIssue && (
        <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded text-xs uppercase font-medium ${getSeverityColor(selectedIssue.severity)}`}>
              {selectedIssue.severity}
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400 text-sm">{selectedIssue.category}</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300 text-sm">{selectedIssue.issue_type}</span>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-zinc-500">URL: </span>
              <a
                href={selectedIssue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline break-all"
              >
                {selectedIssue.url}
              </a>
            </div>

            <div>
              <span className="text-zinc-500">Description:</span>
              <p className="text-zinc-300 mt-1">{selectedIssue.description}</p>
            </div>

            {selectedIssue.recommendation && (
              <div>
                <span className="text-zinc-500">Recommendation:</span>
                <p className="text-zinc-300 mt-1">{selectedIssue.recommendation}</p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium">
                <Ticket className="w-3 h-3" />
                Create Jira Ticket
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium">
                Copy Details
              </button>
              <a
                href={selectedIssue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                Open URL
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-zinc-500 text-center">
        Showing {filteredIssues.length} of {issues.length} priority issues
        {allIssuesSummary ? ` (out of ${allIssuesSummary.total_count.toLocaleString()} total across all URLs)` : ''}
      </div>
    </div>
  );
}
