'use client';

import { DataVoid } from '@/types/geo';
import { sampleDataVoids } from '@/data/sample-geo';

interface DataVoidsSectionProps {
  voids?: DataVoid[];
}

export function DataVoidsSection({ voids }: DataVoidsSectionProps) {
  // Use provided voids or fall back to sample data
  const dataVoids = voids && voids.length > 0 ? voids : sampleDataVoids;

  return (
    <div className="rounded-lg border border-zinc-700 overflow-hidden">
      <table className="w-full data-table text-sm">
        <thead className="bg-zinc-800/50">
          <tr>
            <th>Topic</th>
            <th>Score</th>
            <th>Priority</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {dataVoids.map((void_, index) => (
            <tr key={index}>
              <td className="text-zinc-300">{void_.topic}</td>
              <td className="text-zinc-300">{(void_.score * 100).toFixed(0)}</td>
              <td>
                <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                  void_.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                  void_.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {void_.priority}
                </span>
              </td>
              <td>
                {void_.recommended_action ? (
                  <span className="text-xs text-zinc-400">{void_.recommended_action}</span>
                ) : (
                  <button className="text-blue-400 hover:text-blue-300 text-sm">
                    Action
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {dataVoids.length === 0 && (
        <div className="p-4 text-center text-sm text-zinc-500">
          No data voids found
        </div>
      )}
    </div>
  );
}
