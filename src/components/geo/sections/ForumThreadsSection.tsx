'use client';

import { useState } from 'react';
import {
  MessageSquare,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  User,
  ArrowUpRight,
  Send,
  Shield,
} from 'lucide-react';

interface ForumComment {
  author: string;
  body: string;
  score: number;
}

interface ForumThread {
  id: string;
  runId: string;
  region: string;
  platform: string;
  url: string;
  title: string;
  content: string;
  community: string;
  author: string;
  commentCount: number;
  engagementScore: number;
  sentiment: string;
  urgency: string;
  opportunityType: string;
  brandMentioned: boolean;
  competitorsMentioned: string[];
  summary: string;
  actionNeeded: boolean;
  draftResponse: string;
  responseTone: string;
  includesDisclosure: boolean;
  approvalStatus: string;
  reviewerNotes: string;
  comments: ForumComment[];
  threadDate: string;
  createdAt: string;
}

interface ForumThreadsSectionProps {
  threads: ForumThread[];
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
  stackexchange: 'StackExchange',
  discourse: 'Discourse',
};

const approvalColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
  needs_revision: 'bg-orange-500/20 text-orange-400',
};

const toneLabels: Record<string, string> = {
  helpful: 'Helpful',
  empathetic: 'Empathetic',
  informative: 'Informative',
};

export function ForumThreadsSection({ threads }: ForumThreadsSectionProps) {
  const actionThreads = threads.filter(t => t.actionNeeded);
  const monitorThreads = threads.filter(t => !t.actionNeeded);

  return (
    <div className="space-y-4">
      {actionThreads.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Action Needed ({actionThreads.length})
          </h4>
          <ThreadList threads={actionThreads} />
        </div>
      )}

      {monitorThreads.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Monitoring ({monitorThreads.length})
          </h4>
          <ThreadList threads={monitorThreads} />
        </div>
      )}

      {threads.length === 0 && (
        <p className="p-4 text-center text-sm text-zinc-500">No forum threads found.</p>
      )}
    </div>
  );
}

function ThreadList({ threads }: { threads: ForumThread[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {threads.map((thread) => (
        <ThreadCard
          key={thread.id}
          thread={thread}
          isExpanded={expandedId === thread.id}
          onToggle={() => setExpandedId(expandedId === thread.id ? null : thread.id)}
        />
      ))}
    </div>
  );
}

function ThreadCard({
  thread,
  isExpanded,
  onToggle,
}: {
  thread: ForumThread;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(thread.approvalStatus);
  const urgencyInfo = urgencyIcons[thread.urgency] || urgencyIcons.informational;
  const UrgencyIcon = urgencyInfo.icon;
  const comments = thread.comments || [];

  async function handleApproval(status: string) {
    setApprovalLoading(true);
    try {
      const res = await fetch(`/api/geo/forums/threads/${thread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_status: status }),
      });
      if (res.ok) {
        setLocalStatus(status);
      }
    } catch {
      // silently fail, user can retry
    } finally {
      setApprovalLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 overflow-hidden">
      {/* Collapsed header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
        />
        <MessageSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-200 truncate">{thread.title}</span>
            {thread.url && (
              <a
                href={thread.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-blue-400 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="text-[11px] text-zinc-600 mt-0.5 flex items-center gap-2">
            <span>{platformLabels[thread.platform] || thread.platform}</span>
            <span>&middot;</span>
            <span>{thread.community}</span>
            <span>&middot;</span>
            <span>{thread.commentCount} comments</span>
            {thread.engagementScore > 0 && (
              <>
                <span>&middot;</span>
                <span>{thread.engagementScore} pts</span>
              </>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded text-[10px] capitalize ${sentimentColors[thread.sentiment] || sentimentColors.neutral}`}>
            {thread.sentiment}
          </span>
          <div className="flex items-center gap-1">
            <UrgencyIcon className={`w-3 h-3 ${urgencyInfo.color}`} />
          </div>
          {thread.brandMentioned && (
            <Shield className="w-3 h-3 text-blue-400" />
          )}
          <span className={`px-2 py-0.5 rounded text-[10px] capitalize ${approvalColors[localStatus] || approvalColors.pending}`}>
            {localStatus || 'pending'}
          </span>
          <span className="text-[10px] text-zinc-600 whitespace-nowrap">
            {formatDate(thread.threadDate || thread.createdAt)}
          </span>
        </div>
      </button>

      {/* Expanded detail panel */}
      {isExpanded && (
        <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
          {/* Summary */}
          {thread.summary && (
            <div>
              <h5 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1">Summary</h5>
              <p className="text-sm text-zinc-300 leading-relaxed">{thread.summary}</p>
            </div>
          )}

          {/* Competitors */}
          {thread.competitorsMentioned && thread.competitorsMentioned.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Competitors:</span>
              {thread.competitorsMentioned.map((c) => (
                <span key={c} className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[11px]">
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Post Content */}
          {thread.content && (
            <div>
              <h5 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <User className="w-3 h-3" />
                Original Post by {thread.author || 'Unknown'}
              </h5>
              <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3">
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {thread.content}
                </p>
              </div>
            </div>
          )}

          {/* Comments */}
          {comments.length > 0 && (
            <div>
              <h5 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                Comments ({comments.length})
              </h5>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {comments.map((comment, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-3"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-zinc-500" />
                        <span className="text-xs font-medium text-zinc-400">
                          {comment.author || 'Anonymous'}
                        </span>
                      </div>
                      {comment.score !== 0 && (
                        <div className="flex items-center gap-1">
                          <ArrowUpRight className={`w-3 h-3 ${comment.score > 0 ? 'text-green-500' : 'text-red-500'}`} />
                          <span className={`text-xs ${comment.score > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {comment.score > 0 ? '+' : ''}{comment.score}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {comment.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft Response */}
          {thread.draftResponse && (
            <div>
              <h5 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Send className="w-3 h-3" />
                Draft Response
                {thread.responseTone && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-normal">
                    {toneLabels[thread.responseTone] || thread.responseTone}
                  </span>
                )}
                {thread.includesDisclosure && (
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-normal">
                    Disclosure
                  </span>
                )}
              </h5>
              <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {thread.draftResponse}
                </p>
              </div>

              {/* Reviewer Notes */}
              {thread.reviewerNotes && (
                <div className="mt-2 rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Reviewer Notes: </span>
                  <span className="text-xs text-zinc-400">{thread.reviewerNotes}</span>
                </div>
              )}

              {/* Approval Actions */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => handleApproval('approved')}
                  disabled={approvalLoading || localStatus === 'approved'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ThumbsUp className="w-3 h-3" />
                  Approve
                </button>
                <button
                  onClick={() => handleApproval('needs_revision')}
                  disabled={approvalLoading || localStatus === 'needs_revision'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Revise
                </button>
                <button
                  onClick={() => handleApproval('rejected')}
                  disabled={approvalLoading || localStatus === 'rejected'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ThumbsDown className="w-3 h-3" />
                  Reject
                </button>
                {localStatus && localStatus !== 'pending' && (
                  <span className={`ml-2 px-2 py-0.5 rounded text-[10px] capitalize ${approvalColors[localStatus]}`}>
                    {localStatus.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* No response for this thread */}
          {!thread.draftResponse && thread.actionNeeded && (
            <div className="rounded-lg bg-zinc-800/40 border border-zinc-700/30 p-3 text-center">
              <p className="text-xs text-zinc-500">No draft response generated for this thread.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
