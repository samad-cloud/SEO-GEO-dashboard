'use client';

import { useState } from 'react';
import { FileText, Star, Calendar } from 'lucide-react';
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
  comparison: 'bg-blue-500/20 text-blue-400',
  how_to: 'bg-green-500/20 text-green-400',
  review: 'bg-purple-500/20 text-purple-400',
  guide: 'bg-cyan-500/20 text-cyan-400',
  listicle: 'bg-yellow-500/20 text-yellow-400',
};

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-500/20 text-zinc-400',
  published: 'bg-green-500/20 text-green-400',
  scheduled: 'bg-blue-500/20 text-blue-400',
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

export function BlogPostsSection({ briefs, posts }: BlogPostsSectionProps) {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  return (
    <div className="space-y-4">
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
          <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Content Briefs ({briefs.length})
          </h4>
          <div className="rounded-lg border border-zinc-700 overflow-hidden">
            <table className="w-full data-table text-sm">
              <thead className="bg-zinc-800/50">
                <tr>
                  <th>Topic</th>
                  <th>Type</th>
                  <th>Impact</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {briefs.map((brief) => (
                  <tr key={brief.id}>
                    <td>
                      <span className="text-zinc-300 max-w-[300px] truncate block">{brief.topic}</span>
                    </td>
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
                    <td className="text-zinc-500 text-xs whitespace-nowrap">{formatDate(brief.createdAt)}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-xs capitalize ${statusColors[brief.status] || 'bg-zinc-500/20 text-zinc-400'}`}>
                        {brief.status}
                      </span>
                    </td>
                  </tr>
                ))}
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
