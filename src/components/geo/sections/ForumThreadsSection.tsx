'use client';

import { MessageSquare, ExternalLink, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface ForumThread {
  id: string;
  runId: string;
  region: string;
  platform: string;
  url: string;
  title: string;
  community: string;
  commentCount: number;
  engagementScore: number;
  sentiment: string;
  urgency: string;
  opportunityType: string;
  brandMentioned: boolean;
  actionNeeded: boolean;
  approvalStatus: string;
  draftResponse: string | null;
  threadDate: string;
  createdAt: string;
}

function formatDate(iso: string): string {
  if (!iso) return '--';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

interface ForumThreadsSectionProps {
  threads: ForumThread[];
}

const sentimentColors: Record<string, string> = {
  positive: 'bg-green-500/20 text-green-400',
  negative: 'bg-red-500/20 text-red-400',
  neutral: 'bg-zinc-500/20 text-zinc-400',
  mixed: 'bg-yellow-500/20 text-yellow-400',
};

const urgencyIcons: Record<string, { icon: typeof AlertTriangle; color: string }> = {
  immediate: { icon: AlertTriangle, color: 'text-red-400' },
  can_wait: { icon: Clock, color: 'text-yellow-400' },
  informational: { icon: CheckCircle, color: 'text-zinc-500' },
};

const platformLabels: Record<string, string> = {
  reddit: 'Reddit',
  quora: 'Quora',
  trustpilot: 'Trustpilot',
  bbb: 'BBB',
};

const approvalColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  needs_revision: 'bg-orange-500/20 text-orange-400',
};

export function ForumThreadsSection({ threads }: ForumThreadsSectionProps) {
  const actionThreads = threads.filter(t => t.actionNeeded);
  const monitorThreads = threads.filter(t => !t.actionNeeded);

  return (
    <div className="space-y-4">
      {/* Action Needed Threads */}
      {actionThreads.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Action Needed ({actionThreads.length})
          </h4>
          <ThreadTable threads={actionThreads} />
        </div>
      )}

      {/* Monitoring Threads */}
      {monitorThreads.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Monitoring ({monitorThreads.length})
          </h4>
          <ThreadTable threads={monitorThreads} />
        </div>
      )}

      {threads.length === 0 && (
        <p className="p-4 text-center text-sm text-zinc-500">No forum threads found.</p>
      )}
    </div>
  );
}

function ThreadTable({ threads }: { threads: ForumThread[] }) {
  return (
    <div className="rounded-lg border border-zinc-700 overflow-hidden">
      <table className="w-full data-table text-sm">
        <thead className="bg-zinc-800/50">
          <tr>
            <th>Thread</th>
            <th>Platform</th>
            <th>Sentiment</th>
            <th>Urgency</th>
            <th>Brand</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {threads.map((thread) => {
            const urgencyInfo = urgencyIcons[thread.urgency] || urgencyIcons.informational;
            const UrgencyIcon = urgencyInfo.icon;

            return (
              <tr key={thread.id}>
                <td>
                  <div className="max-w-[280px]">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      {thread.url ? (
                        <a
                          href={thread.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 truncate text-xs hover:underline"
                        >
                          {thread.title}
                        </a>
                      ) : (
                        <span className="text-zinc-300 truncate text-xs">{thread.title}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-0.5 pl-5">
                      {thread.community} &middot; {thread.commentCount} comments
                    </div>
                  </div>
                </td>
                <td>
                  <span className="text-zinc-400 text-xs">{platformLabels[thread.platform] || thread.platform}</span>
                </td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs capitalize ${sentimentColors[thread.sentiment] || sentimentColors.neutral}`}>
                    {thread.sentiment}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <UrgencyIcon className={`w-3 h-3 ${urgencyInfo.color}`} />
                    <span className={`text-xs ${urgencyInfo.color}`}>
                      {thread.urgency.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td>
                  {thread.brandMentioned ? (
                    <span className="text-green-400 text-xs">Yes</span>
                  ) : (
                    <span className="text-zinc-600 text-xs">No</span>
                  )}
                </td>
                <td className="text-zinc-500 text-xs whitespace-nowrap">
                  {formatDate(thread.threadDate || thread.createdAt)}
                </td>
                <td>
                  <span className={`px-2 py-0.5 rounded text-xs capitalize ${approvalColors[thread.approvalStatus] || approvalColors.pending}`}>
                    {thread.approvalStatus || 'pending'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
