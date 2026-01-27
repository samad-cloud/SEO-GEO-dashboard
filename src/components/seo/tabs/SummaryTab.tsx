'use client';

import { AuditReport } from '@/types/seo';
import { formatNumber, getSeverityColor } from '@/lib/utils';
import { Folder, FileText, Zap, Shield, Smartphone, Globe, Link2, Code } from 'lucide-react';

interface SummaryTabProps {
  report: AuditReport;
}

const categoryIcons: Record<string, React.ReactNode> = {
  crawlability: <Folder className="w-4 h-4" />,
  content: <FileText className="w-4 h-4" />,
  performance: <Zap className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  mobile: <Smartphone className="w-4 h-4" />,
  international: <Globe className="w-4 h-4" />,
  links: <Link2 className="w-4 h-4" />,
  schema: <Code className="w-4 h-4" />,
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'excellent': return 'text-green-500 bg-green-500/10';
    case 'good': return 'text-yellow-500 bg-yellow-500/10';
    case 'needs-improvement': return 'text-orange-500 bg-orange-500/10';
    case 'poor': return 'text-red-500 bg-red-500/10';
    default: return 'text-zinc-500 bg-zinc-500/10';
  }
};

export function SummaryTab({ report }: SummaryTabProps) {
  const summary = report.summary;
  const domainReport = report.reports[0];
  const issueSummary = domainReport?.issue_summary || summary;

  // Calculate info count
  const totalBySeverity = (issueSummary.critical_count || 0) +
    (issueSummary.high_count || 0) +
    (issueSummary.medium_count || 0) +
    (issueSummary.low_count || 0);
  const infoCount = issueSummary.total_issues - totalBySeverity;

  const severityData = [
    { label: 'Critical', count: issueSummary.critical_count || 0, percent: 0, color: 'bg-red-600', dotColor: 'text-red-600' },
    { label: 'High', count: issueSummary.high_count || 0, percent: 0, color: 'bg-orange-500', dotColor: 'text-orange-500' },
    { label: 'Medium', count: issueSummary.medium_count || 0, percent: 0, color: 'bg-yellow-500', dotColor: 'text-yellow-500' },
    { label: 'Low', count: issueSummary.low_count || 0, percent: 0, color: 'bg-green-500', dotColor: 'text-green-500' },
    { label: 'Info', count: infoCount > 0 ? infoCount : 0, percent: 0, color: 'bg-blue-500', dotColor: 'text-blue-500' },
  ].map(item => ({
    ...item,
    percent: issueSummary.total_issues > 0
      ? Math.round((item.count / issueSummary.total_issues) * 100)
      : 0
  }));

  return (
    <div className="space-y-6">
      {/* Issue Summary */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">
          Issue Summary
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: summary.total_issues, color: 'text-zinc-200' },
            { label: 'New', value: summary.new_issues, color: 'text-blue-400' },
            { label: 'Fixed', value: summary.fixed_issues, color: 'text-green-400' },
            { label: 'Regressed', value: summary.regressed_issues, color: 'text-red-400' },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
              <div className={`text-2xl font-bold ${item.color}`}>
                {formatNumber(item.value)}
              </div>
              <div className="text-xs text-zinc-500">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* By Severity */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">
          By Severity
        </h3>
        <div className="space-y-2">
          {severityData.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-24 text-xs text-zinc-400 flex items-center gap-2">
                <span className={`${item.dotColor}`}>●</span>
                {item.label}
              </div>
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} progress-bar`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
              <div className="w-24 text-right text-xs">
                <span className="text-zinc-300">{formatNumber(item.count)}</span>
                <span className="text-zinc-500 ml-1">({item.percent}%)</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category Scores */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">
          Category Scores
        </h3>
        <div className="rounded-lg border border-zinc-700 overflow-hidden">
          <table className="w-full data-table">
            <thead className="bg-zinc-800/50">
              <tr>
                <th>Category</th>
                <th>Score</th>
                <th>Issues</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {domainReport && Object.entries(domainReport.category_scores).map(([category, data]) => (
                <tr key={category}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">
                        {categoryIcons[category] || <Folder className="w-4 h-4" />}
                      </span>
                      <span className="capitalize text-zinc-300">{category}</span>
                    </div>
                  </td>
                  <td className="text-zinc-300">{data.score}/100</td>
                  <td className="text-zinc-400">{formatNumber(data.issue_count)}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-xs capitalize ${getStatusColor(data.status)}`}>
                      {data.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Crawl & PageSpeed Summary */}
      <div className="grid grid-cols-2 gap-4">
        {domainReport?.crawl_summary && (
          <section className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">
              Crawl Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">URLs Crawled</span>
                <span className="text-zinc-300">{formatNumber(domainReport.crawl_summary.urls_crawled)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Successful</span>
                <span className="text-zinc-300">{formatNumber(domainReport.crawl_summary.successful)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Soft Errors</span>
                <span className="text-zinc-300">{formatNumber(domainReport.crawl_summary.soft_errors)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Valid Pages</span>
                <span className="text-zinc-300">{formatNumber(domainReport.crawl_summary.valid_pages)}</span>
              </div>
            </div>
          </section>
        )}

        {domainReport?.pagespeed_summary && (
          <section className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide mb-3">
              PageSpeed Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">URLs Analyzed</span>
                <span className="text-zinc-300">{formatNumber(domainReport.pagespeed_summary.urls_analyzed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Mobile Results</span>
                <span className="text-zinc-300">{formatNumber(domainReport.pagespeed_summary.mobile_results)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Desktop Results</span>
                <span className="text-zinc-300">{formatNumber(domainReport.pagespeed_summary.desktop_results)}</span>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
