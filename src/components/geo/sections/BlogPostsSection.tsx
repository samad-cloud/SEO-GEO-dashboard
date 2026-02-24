'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Star, Calendar, Radar, Sparkles, Loader2, ImageIcon } from 'lucide-react';
import { BlogPostViewer } from './BlogPostViewer';

interface ContentBrief {
  id: string;
  runId: string;
  region: string;
  topic: string;
  gapType: string;
  expectedImpact: number;
  bluf: string;
  status: string;
  createdAt: string;
  briefJson?: {
    source?: string;
    content_type?: string;
    brand_coverage?: number;
    opportunity_score?: number;
    target_prompts?: string[];
    seo_angle?: string;
  };
}

interface BlogPost {
  id: number;
  runId: string;
  region: string;
  topic: string;
  slug: string;
  titleTag: string;
  metaDescription: string;
  focusKeyword: string;
  contentMarkdown: string;
  qualityScore: number;
  wordCount: number;
  category: string;
  tags: string[];
  imageCount: number;
  createdAt: string;
}

interface BlogPostsSectionProps {
  briefs: ContentBrief[];
  posts: BlogPost[];
  onRefresh?: () => void;
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

const gapTypeColors: Record<string, string> = {
  data_void: 'bg-orange-500/20 text-orange-400',
  comparison: 'bg-blue-500/20 text-blue-400',
  how_to: 'bg-green-500/20 text-green-400',
  review: 'bg-purple-500/20 text-purple-400',
  guide: 'bg-cyan-500/20 text-cyan-400',
  listicle: 'bg-yellow-500/20 text-yellow-400',
};

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-500/20 text-zinc-400',
  assigned: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-yellow-500/20 text-yellow-400',
  published: 'bg-green-500/20 text-green-400',
  refresh_needed: 'bg-orange-500/20 text-orange-400',
};

function QualityBar({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-zinc-400">{score}</span>
    </div>
  );
}

function ProgressBar({ percent, step }: { percent: number; step: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[10px] text-zinc-500 whitespace-nowrap">{percent}%</span>
    </div>
  );
}

export function BlogPostsSection({ briefs, posts, onRefresh }: BlogPostsSectionProps) {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [expandedBrief, setExpandedBrief] = useState<string | null>(null);

  // Blog generation state
  const [generatingBriefId, setGeneratingBriefId] = useState<string | null>(null);
  const [generationRunId, setGenerationRunId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generateImages, setGenerateImages] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startGeneration = useCallback(async (brief: ContentBrief) => {
    setGeneratingBriefId(brief.id);
    setGenerationError(null);
    setGenerationProgress(0);
    setGenerationStep('Starting...');

    try {
      const res = await fetch('/api/geo/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief_id: brief.id,
          region: brief.region || 'us',
          generate_images: generateImages,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to start' }));
        throw new Error(err.error || err.details || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const runId = data.run_id;
      setGenerationRunId(runId);

      // Start polling for progress
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/geo/blog/generate/${runId}`);
          if (!pollRes.ok) return;

          const progress = await pollRes.json();
          setGenerationProgress(progress.progress_percent || 0);
          setGenerationStep(progress.current_step || '');

          if (progress.status === 'complete') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setGeneratingBriefId(null);
            setGenerationRunId(null);
            setGenerationProgress(0);
            setGenerationStep('');
            // Refresh data
            if (onRefresh) {
              onRefresh();
            } else {
              window.location.reload();
            }
          } else if (progress.status === 'failed' || progress.status === 'cancelled') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setGenerationError(
              progress.errors?.length
                ? progress.errors[0].split('\n')[0]
                : progress.current_step || 'Generation failed'
            );
            setGeneratingBriefId(null);
            setGenerationRunId(null);
          }
        } catch {
          // Polling error — keep trying
        }
      }, 3000);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Failed to start generation');
      setGeneratingBriefId(null);
    }
  }, [generateImages, onRefresh]);

  const isGenerating = generatingBriefId !== null;

  return (
    <div className="space-y-4">
      {/* Generation error banner */}
      {generationError && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center justify-between">
          <span>{generationError}</span>
          <button
            onClick={() => setGenerationError(null)}
            className="text-red-500 hover:text-red-300 ml-2"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Blog Posts */}
      {posts.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Generated Posts ({posts.length})
          </h4>
          <div className="rounded-lg border border-zinc-700 overflow-hidden">
            <table className="w-full data-table text-sm">
              <thead className="bg-zinc-800/50">
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Quality</th>
                  <th>Words</th>
                  <th>Date</th>
                  <th>Region</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="cursor-pointer hover:bg-zinc-800/50 transition-colors"
                  >
                    <td>
                      <div className="flex items-center gap-2 max-w-[300px]">
                        <FileText className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span className="text-zinc-300 truncate hover:text-purple-300 transition-colors">
                          {post.titleTag || post.topic}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                        {post.category}
                      </span>
                    </td>
                    <td><QualityBar score={post.qualityScore} /></td>
                    <td className="text-zinc-400">{post.wordCount.toLocaleString()}</td>
                    <td className="text-zinc-500 text-xs whitespace-nowrap">{formatDate(post.createdAt)}</td>
                    <td className="text-zinc-500 text-xs uppercase">{post.region}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content Briefs */}
      {briefs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Content Briefs ({briefs.length})
              <span className="ml-2 text-zinc-600 normal-case">
                {briefs.filter(b => b.briefJson?.source === 'audit_data_void').length} from audit
              </span>
            </h4>
            <label className="flex items-center gap-1.5 text-[10px] text-zinc-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={generateImages}
                onChange={(e) => setGenerateImages(e.target.checked)}
                className="w-3 h-3 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500/20"
              />
              <ImageIcon className="w-3 h-3" />
              Generate images
            </label>
          </div>
          <div className="rounded-lg border border-zinc-700 overflow-hidden">
            <table className="w-full data-table text-sm">
              <thead className="bg-zinc-800/50">
                <tr>
                  <th>Topic</th>
                  <th>Type</th>
                  <th>Impact</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Region</th>
                  <th className="w-[100px]"></th>
                </tr>
              </thead>
              <tbody>
                {briefs.map((brief) => {
                  const isFromAudit = brief.briefJson?.source === 'audit_data_void';
                  const hasExistingPost = posts.some(p =>
                    p.topic.toLowerCase().includes(brief.topic.toLowerCase().slice(0, 30)) ||
                    brief.topic.toLowerCase().includes(p.topic.toLowerCase().slice(0, 30))
                  );
                  const isExpanded = expandedBrief === brief.id;
                  const isBriefGenerating = generatingBriefId === brief.id;
                  return (
                    <tr key={brief.id} className="group">
                      <td colSpan={isExpanded ? 7 : undefined} className={isExpanded ? 'p-0' : undefined}>
                        {isExpanded ? (
                          <div className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-200 font-medium">{brief.topic}</span>
                              <div className="flex items-center gap-2">
                                {!hasExistingPost && !isGenerating && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); startGeneration(brief); }}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    Generate{generateImages ? ' + Images' : ''}
                                  </button>
                                )}
                                <button
                                  onClick={() => setExpandedBrief(null)}
                                  className="text-xs text-zinc-500 hover:text-zinc-300"
                                >
                                  collapse
                                </button>
                              </div>
                            </div>
                            {brief.bluf && (
                              <p className="text-xs text-zinc-400 leading-relaxed">{brief.bluf}</p>
                            )}
                            {brief.briefJson?.seo_angle && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {brief.briefJson.seo_angle.split(', ').map((kw, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-500">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                            {brief.briefJson?.target_prompts && (
                              <div className="mt-1">
                                <span className="text-[10px] text-zinc-600 uppercase">Target prompts:</span>
                                <ul className="mt-0.5 space-y-0.5">
                                  {brief.briefJson.target_prompts.map((p, i) => (
                                    <li key={i} className="text-xs text-zinc-500 pl-2">&ldquo;{p}&rdquo;</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {hasExistingPost && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-green-400">
                                <FileText className="w-3 h-3" />
                                Blog post exists for this topic
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 max-w-[350px] cursor-pointer"
                            onClick={() => setExpandedBrief(brief.id)}
                          >
                            {hasExistingPost && (
                              <span title="Blog post exists">
                                <FileText className="w-3 h-3 text-green-500 flex-shrink-0" />
                              </span>
                            )}
                            <span className="text-zinc-300 truncate hover:text-orange-300 transition-colors">
                              {brief.topic}
                            </span>
                          </div>
                        )}
                      </td>
                      {!isExpanded && (
                        <>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-xs capitalize ${gapTypeColors[brief.gapType] || 'bg-zinc-500/20 text-zinc-400'}`}>
                              {brief.gapType.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <Star className={`w-3 h-3 ${brief.expectedImpact > 0.7 ? 'text-yellow-400' : 'text-zinc-600'}`} />
                              <span className="text-zinc-400">{(brief.expectedImpact * 100).toFixed(0)}%</span>
                            </div>
                          </td>
                          <td>
                            {isFromAudit ? (
                              <span className="flex items-center gap-1 text-xs text-orange-400" title="Generated from LLM audit data voids">
                                <Radar className="w-3 h-3" />
                                audit
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-zinc-500">
                                <Sparkles className="w-3 h-3" />
                                crew
                              </span>
                            )}
                          </td>
                          <td>
                            {isBriefGenerating ? (
                              <ProgressBar percent={generationProgress} step={generationStep} />
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-xs capitalize ${statusColors[brief.status] || 'bg-zinc-500/20 text-zinc-400'}`}>
                                {brief.status.replace('_', ' ')}
                              </span>
                            )}
                          </td>
                          <td className="text-zinc-500 text-xs uppercase">{brief.region}</td>
                          <td>
                            {isBriefGenerating ? (
                              <span className="flex items-center gap-1 text-xs text-purple-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {generationStep ? generationStep.slice(0, 20) : 'Generating...'}
                              </span>
                            ) : !hasExistingPost && !isGenerating ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); startGeneration(brief); }}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors opacity-0 group-hover:opacity-100"
                                title={`Generate blog post${generateImages ? ' with images' : ''}`}
                              >
                                <Sparkles className="w-3 h-3" />
                                Generate
                              </button>
                            ) : null}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {briefs.length === 0 && posts.length === 0 && (
        <p className="p-4 text-center text-sm text-zinc-500">No blog data available.</p>
      )}

      {/* Blog Post Viewer */}
      {selectedPost && (
        <BlogPostViewer
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}
