'use client';

import { CheckCircle2, Circle, Lightbulb } from 'lucide-react';

interface StrategySummarySectionProps {
  strategySummary: string;
  crewsCompleted: string[];
}

const crewLabels: Record<string, string> = {
  llm_audit: 'LLM Audit',
  blog: 'Blog Research',
  blog_writer: 'Blog Writer',
  forums: 'Forums',
  wiki: 'Wiki',
  technical: 'Technical',
};

const allCrews = ['llm_audit', 'blog', 'forums', 'wiki', 'technical'];

export function StrategySummarySection({ strategySummary, crewsCompleted }: StrategySummarySectionProps) {
  return (
    <div className="space-y-4">
      {/* Crew Status */}
      <div>
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Crew Status</h4>
        <div className="flex flex-wrap gap-2">
          {allCrews.map((crew) => {
            const completed = crewsCompleted.includes(crew);
            return (
              <div
                key={crew}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${
                  completed
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-500'
                }`}
              >
                {completed ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
                {crewLabels[crew] || crew}
              </div>
            );
          })}
        </div>
      </div>

      {/* Strategy Summary */}
      {strategySummary && (
        <div>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Strategy Synthesis</h4>
          <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{strategySummary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
