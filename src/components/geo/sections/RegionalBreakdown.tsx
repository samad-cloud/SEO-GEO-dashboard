'use client';

import { RegionalBreakdown } from '@/types/geo';
import { getRegionFlag, getThreatColor } from '@/lib/utils';

interface RegionalBreakdownSectionProps {
  regions: RegionalBreakdown[];
}

export function RegionalBreakdownSection({ regions }: RegionalBreakdownSectionProps) {
  return (
    <div className="rounded-lg border border-zinc-700 overflow-hidden">
      <table className="w-full data-table text-sm">
        <thead className="bg-zinc-800/50">
          <tr>
            <th>Region</th>
            <th>SoM</th>
            <th>Top Competitor</th>
            <th>Opportunities</th>
            <th>Threats</th>
          </tr>
        </thead>
        <tbody>
          {regions.map((region) => (
            <tr key={region.region}>
              <td>
                <div className="flex items-center gap-2">
                  <span>{getRegionFlag(region.region)}</span>
                  <span className="text-zinc-300 uppercase">{region.region}</span>
                </div>
              </td>
              <td className="text-zinc-300">{region.som}%</td>
              <td className="text-zinc-400">{region.topCompetitor}</td>
              <td className="text-zinc-300">{region.opportunities}</td>
              <td>
                <span className={`capitalize ${getThreatColor(region.threats)}`}>
                  {region.threats}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
