'use client';

import { GeoTask } from '@/types/geo';
import { formatDate } from '@/lib/utils';

interface TaskQueueSectionProps {
  tasks: GeoTask[];
}

const statusIcons: Record<string, string> = {
  pending: '⏳',
  in_progress: '🔄',
  completed: '✅',
  failed: '❌',
  blocked: '🚧',
};

const statusColors: Record<string, string> = {
  pending: 'text-yellow-400',
  in_progress: 'text-blue-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
  blocked: 'text-orange-400',
};

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
};

export function TaskQueueSection({ tasks }: TaskQueueSectionProps) {
  return (
    <div className="rounded-lg border border-zinc-700 overflow-hidden">
      <table className="w-full data-table text-sm">
        <thead className="bg-zinc-800/50">
          <tr>
            <th>Status</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Created</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <span className={statusColors[task.status]}>
                  {statusIcons[task.status]} {task.status.replace('_', ' ')}
                </span>
              </td>
              <td className="text-zinc-300">{task.type}</td>
              <td>
                <span className={`px-2 py-0.5 rounded text-xs capitalize ${priorityColors[task.priority]}`}>
                  {task.priority}
                </span>
              </td>
              <td className="text-zinc-500">{formatDate(task.createdAt)}</td>
              <td>
                {task.status === 'pending' && (
                  <button className="text-blue-400 hover:text-blue-300 text-xs">[Start]</button>
                )}
                {task.status === 'completed' && (
                  <button className="text-blue-400 hover:text-blue-300 text-xs">[View]</button>
                )}
                {task.status === 'failed' && (
                  <button className="text-blue-400 hover:text-blue-300 text-xs">[Retry]</button>
                )}
                {task.status === 'in_progress' && (
                  <span className="text-zinc-500 text-xs">Running...</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
