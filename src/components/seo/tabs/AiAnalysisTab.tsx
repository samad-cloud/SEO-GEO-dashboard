'use client';

import { Brain, AlertTriangle, Zap, Lightbulb, ArrowRight } from 'lucide-react';
import type { AiAnalysis } from '@/types/seo';

interface AiAnalysisTabProps {
  aiAnalysis?: AiAnalysis;
}

export function AiAnalysisTab({ aiAnalysis }: AiAnalysisTabProps) {
  if (!aiAnalysis?.executive_summary) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-7 h-7 text-zinc-600" />
          </div>
          <h3 className="text-sm font-medium text-zinc-400 mb-1">No AI Analysis Available</h3>
          <p className="text-xs text-zinc-500">
            AI analysis was not generated for this audit run. Enable AI analysis in your audit configuration to see insights here.
          </p>
        </div>
      </div>
    );
  }

  const { executive_summary, recommendations } = aiAnalysis;

  return (
    <div className="space-y-6">
      {/* Executive Overview */}
      {executive_summary.overview && (
        <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              Executive Summary
            </h3>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
            {executive_summary.overview}
          </p>
        </div>
      )}

      {/* Critical Issues */}
      {executive_summary.critical_issues && executive_summary.critical_issues.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              Critical Issues ({executive_summary.critical_issues.length})
            </h3>
          </div>
          <div className="space-y-2">
            {executive_summary.critical_issues.map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <p className="text-sm font-medium text-zinc-200">{item.issue}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  <span className="text-red-400">Impact:</span> {item.impact}
                </p>
                {item.recommendation && (
                  <p className="text-xs text-zinc-400 mt-1">
                    <ArrowRight className="w-3 h-3 inline mr-1 text-zinc-500" />
                    {item.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Important Optimizations */}
      {executive_summary.important_optimizations && executive_summary.important_optimizations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              Important Optimizations ({executive_summary.important_optimizations.length})
            </h3>
          </div>
          <div className="space-y-2">
            {executive_summary.important_optimizations.map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-sm font-medium text-zinc-200">{item.issue}</p>
                {item.impact && (
                  <p className="text-xs text-zinc-400 mt-1">
                    <span className="text-amber-400">Impact:</span> {item.impact}
                  </p>
                )}
                {item.recommendation && (
                  <p className="text-xs text-zinc-400 mt-1">
                    <ArrowRight className="w-3 h-3 inline mr-1 text-zinc-500" />
                    {item.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Wins */}
      {executive_summary.quick_wins && executive_summary.quick_wins.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-green-400" />
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              Quick Wins ({executive_summary.quick_wins.length})
            </h3>
          </div>
          <div className="space-y-2">
            {executive_summary.quick_wins.map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <p className="text-sm font-medium text-zinc-200">{item.issue}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                  {item.effort && (
                    <span>
                      <span className="text-green-400">Effort:</span> {item.effort}
                    </span>
                  )}
                  {item.impact && (
                    <span>
                      <span className="text-green-400">Impact:</span> {item.impact}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              Recommendations ({recommendations.length})
            </h3>
          </div>
          <div className="rounded-lg border border-zinc-700 overflow-hidden">
            <table className="w-full data-table">
              <thead className="bg-zinc-800/50">
                <tr>
                  <th>Priority</th>
                  <th>Category</th>
                  <th>Recommendation</th>
                  <th>Expected Impact</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-xs uppercase font-medium ${
                        rec.priority === 'high' || rec.priority === 'critical'
                          ? 'bg-red-500/10 text-red-400'
                          : rec.priority === 'medium'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-green-500/10 text-green-400'
                      }`}>
                        {rec.priority}
                      </span>
                    </td>
                    <td className="text-zinc-400 text-sm">{rec.category}</td>
                    <td className="text-zinc-300 text-sm">{rec.recommendation}</td>
                    <td className="text-zinc-400 text-sm">{rec.expected_impact || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
