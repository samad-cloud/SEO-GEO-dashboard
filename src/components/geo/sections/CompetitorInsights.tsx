'use client';

import { CompetitorInsight } from '@/types/geo';
import { getRegionFlag, getThreatColor } from '@/lib/utils';

interface CompetitorInsightsSectionProps {
  competitors: CompetitorInsight[];
}

export function CompetitorInsightsSection({ competitors }: CompetitorInsightsSectionProps) {
  return (
    <div className="rounded-lg border border-zinc-700 overflow-hidden">
      <table className="w-full data-table text-sm">
        <thead className="bg-zinc-800/50">
          <tr>
            <th>Competitor</th>
            <th>Region</th>
            <th>Share</th>
            <th>Threat Level</th>
            <th>Key Strength</th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((competitor, index) => (
            <tr key={index}>
              <td className="text-zinc-300">{competitor.competitor}</td>
              <td>
                <div className="flex items-center gap-1">
                  <span>{getRegionFlag(competitor.region)}</span>
                  <span className="text-zinc-400 uppercase text-xs">{competitor.region}</span>
                </div>
              </td>
              <td className="text-zinc-300">{competitor.share}%</td>
              <td>
                <span className={`capitalize ${getThreatColor(competitor.threatLevel)}`}>
                  {competitor.threatLevel}
                </span>
              </td>
              <td className="text-zinc-400">{competitor.keyStrength || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
