'use client';

import { sampleIssueDetails } from '@/data/sample-geo';
import { getPlatformIcon, getSeverityColor } from '@/lib/utils';

export function IssueDetailSection() {
  return (
    <div className="space-y-4">
      {/* Issue Detail Header */}
      <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Issue Detail</div>
        <div className="text-sm text-zinc-300 mb-2">
          <a href="#" className="text-blue-400 hover:underline">
            https://www.printerpix.com/printerpix/prev.tout
          </a>
          <span className="text-zinc-500 ml-2">[View]</span>
        </div>
        <p className="text-xs text-zinc-500">
          Description: The us is a ver onsids repuses on.oen.cnakrtty ecoositing that corsocly reochiochis, showends and vasts but the recommendation: the scan.es isument...
        </p>
        <button className="mt-2 text-xs text-blue-400 hover:text-blue-300">
          [Create Jira Ticket]
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <select className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">
          <option>Severity</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">
          <option>Category</option>
        </select>
        <select className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300">
          <option>Status</option>
        </select>
        <input
          type="text"
          placeholder="Search..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 placeholder:text-zinc-500"
        />
      </div>

      {/* Issues Table */}
      <div className="rounded-lg border border-zinc-700 overflow-hidden">
        <table className="w-full data-table text-sm">
          <thead className="bg-zinc-800/50">
            <tr>
              <th>Severity</th>
              <th>Category</th>
              <th>Type</th>
              <th>URL</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sampleIssueDetails.map((issue, index) => (
              <tr key={index}>
                <td>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${
                      issue.severity === 'high' ? 'bg-orange-500' :
                      issue.severity === 'medium' ? 'bg-yellow-500' :
                      issue.severity === 'low' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`} />
                    {issue.platform && <span>{getPlatformIcon(issue.platform)}</span>}
                  </div>
                </td>
                <td className="text-zinc-300">{issue.category}</td>
                <td className="text-zinc-400">{issue.type}</td>
                <td className="text-zinc-500 max-w-[150px] truncate">{issue.url}</td>
                <td>
                  <button className="text-blue-400 hover:text-blue-300 text-xs">[View]</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
