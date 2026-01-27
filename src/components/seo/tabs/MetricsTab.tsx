'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import * as Accordion from '@radix-ui/react-accordion';
import { AuditReport } from '@/types/seo';
import { formatNumber } from '@/lib/utils';

interface MetricsTabProps {
  report: AuditReport;
}

export function MetricsTab({ report }: MetricsTabProps) {
  const domainReport = report.reports[0];

  return (
    <div className="space-y-4">
      <Accordion.Root type="multiple" defaultValue={['sitemap']} className="space-y-2">
        {/* Sitemap Indexation */}
        {domainReport?.sitemap_indexation && (
          <Accordion.Item value="sitemap" className="rounded-lg border border-zinc-700 overflow-hidden">
            <Accordion.Trigger className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
              <span className="text-sm font-medium text-zinc-300">Sitemap Indexation</span>
              <ChevronDown className="w-4 h-4 text-zinc-500 accordion-chevron" />
            </Accordion.Trigger>
            <Accordion.Content className="p-4 bg-zinc-900/50">
              <div className="rounded-lg border border-zinc-700 overflow-hidden mb-4">
                <table className="w-full data-table text-sm">
                  <thead className="bg-zinc-800/50">
                    <tr>
                      <th>Sitemap URL</th>
                      <th>Submitted</th>
                      <th>Indexed</th>
                      <th>Rate</th>
                      <th>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domainReport.sitemap_indexation.sitemaps.map((sitemap, idx) => (
                      <tr key={idx}>
                        <td className="text-zinc-400 max-w-xs truncate" title={sitemap.sitemap_url}>
                          {sitemap.sitemap_url.replace('https://', '').substring(0, 40)}...
                        </td>
                        <td className="text-zinc-300">{formatNumber(sitemap.submitted)}</td>
                        <td className="text-zinc-300">{formatNumber(sitemap.indexed)}</td>
                        <td className="text-zinc-300">{sitemap.indexation_rate}%</td>
                        <td className={sitemap.errors > 0 ? 'text-red-400' : 'text-zinc-400'}>
                          {sitemap.errors}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-zinc-800/30">
                      <td className="font-medium text-zinc-300">TOTAL</td>
                      <td className="font-medium text-zinc-300">
                        {formatNumber(domainReport.sitemap_indexation.total_submitted)}
                      </td>
                      <td className="font-medium text-zinc-300">
                        {formatNumber(domainReport.sitemap_indexation.total_indexed)}
                      </td>
                      <td className="font-medium text-zinc-300">
                        {domainReport.sitemap_indexation.total_indexation_rate}%
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {domainReport.sitemap_indexation.note && (
                <p className="text-xs text-zinc-500 italic">
                  Note: {domainReport.sitemap_indexation.note}
                </p>
              )}
            </Accordion.Content>
          </Accordion.Item>
        )}

        {/* PageSpeed Insights */}
        <Accordion.Item value="pagespeed" className="rounded-lg border border-zinc-700 overflow-hidden">
          <Accordion.Trigger className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <span className="text-sm font-medium text-zinc-300">PageSpeed Insights</span>
            <ChevronDown className="w-4 h-4 text-zinc-500 accordion-chevron" />
          </Accordion.Trigger>
          <Accordion.Content className="p-4 bg-zinc-900/50">
            {domainReport?.pagespeed_summary ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-zinc-800/50">
                  <div className="text-2xl font-bold text-zinc-200">
                    {domainReport.pagespeed_summary.urls_analyzed}
                  </div>
                  <div className="text-xs text-zinc-500">URLs Analyzed</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800/50">
                  <div className="text-2xl font-bold text-zinc-200">
                    {domainReport.pagespeed_summary.mobile_results}
                  </div>
                  <div className="text-xs text-zinc-500">Mobile Results</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800/50">
                  <div className="text-2xl font-bold text-zinc-200">
                    {domainReport.pagespeed_summary.desktop_results}
                  </div>
                  <div className="text-xs text-zinc-500">Desktop Results</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No PageSpeed data available</p>
            )}
          </Accordion.Content>
        </Accordion.Item>

        {/* Google Search Console */}
        <Accordion.Item value="gsc" className="rounded-lg border border-zinc-700 overflow-hidden">
          <Accordion.Trigger className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <span className="text-sm font-medium text-zinc-300">Google Search Console</span>
            <ChevronDown className="w-4 h-4 text-zinc-500 accordion-chevron" />
          </Accordion.Trigger>
          <Accordion.Content className="p-4 bg-zinc-900/50">
            {domainReport?.gsc_summary ? (
              <div className="p-3 rounded-lg bg-zinc-800/50 inline-block">
                <div className="text-2xl font-bold text-zinc-200">
                  {formatNumber(domainReport.gsc_summary.urls_with_data)}
                </div>
                <div className="text-xs text-zinc-500">URLs with Data</div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No GSC data available</p>
            )}
          </Accordion.Content>
        </Accordion.Item>

        {/* Security Analysis */}
        <Accordion.Item value="security" className="rounded-lg border border-zinc-700 overflow-hidden">
          <Accordion.Trigger className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <span className="text-sm font-medium text-zinc-300">Security Analysis</span>
            <ChevronDown className="w-4 h-4 text-zinc-500 accordion-chevron" />
          </Accordion.Trigger>
          <Accordion.Content className="p-4 bg-zinc-900/50">
            <p className="text-sm text-zinc-500">Security metrics coming soon...</p>
          </Accordion.Content>
        </Accordion.Item>

        {/* Content Analysis */}
        <Accordion.Item value="content" className="rounded-lg border border-zinc-700 overflow-hidden">
          <Accordion.Trigger className="w-full flex items-center justify-between p-4 bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
            <span className="text-sm font-medium text-zinc-300">Content Analysis</span>
            <ChevronDown className="w-4 h-4 text-zinc-500 accordion-chevron" />
          </Accordion.Trigger>
          <Accordion.Content className="p-4 bg-zinc-900/50">
            <p className="text-sm text-zinc-500">Content metrics coming soon...</p>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}
