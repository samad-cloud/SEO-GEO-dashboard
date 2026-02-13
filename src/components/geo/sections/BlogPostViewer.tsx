'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  X,
  Copy,
  Check,
  Tag,
  FileText,
  Search,
  Award,
} from 'lucide-react';
import { useBlogImages } from '@/hooks/use-geo-research';

interface BlogPost {
  id: number;
  runId: string;
  region: string;
  topic: string;
  briefTopic?: string;
  slug: string;
  titleTag: string;
  metaDescription: string;
  focusKeyword: string;
  contentMarkdown: string;
  qualityScore: number;
  tags: string[];
  category: string;
  imageCount: number;
  wordCount: number;
  createdAt: string;
}

interface BlogPostViewerProps {
  post: BlogPost;
  onClose: () => void;
}

function QualityBadge({ score }: { score: number }) {
  const color = score >= 90
    ? 'bg-green-500/20 text-green-400 border-green-500/30'
    : score >= 70
      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      <Award className="w-3 h-3" />
      {score}/100
    </span>
  );
}

export function BlogPostViewer({ post, onClose }: BlogPostViewerProps) {
  const [copied, setCopied] = useState(false);
  const { images } = useBlogImages(post.id);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(post.contentMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-3xl bg-zinc-900 border-l border-zinc-700 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200 truncate pr-4">
              {post.titleTag || post.topic}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-700"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy Markdown
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <QualityBadge score={post.qualityScore} />
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {post.wordCount.toLocaleString()} words
            </span>
            {post.focusKeyword && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Search className="w-3 h-3" />
                {post.focusKeyword}
              </span>
            )}
            {post.category && (
              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400">
                {post.category}
              </span>
            )}
            <span className="text-[10px] uppercase text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-700">
              {post.region}
            </span>
          </div>

          {/* SEO meta */}
          {post.metaDescription && (
            <p className="text-xs text-zinc-500 mt-2 italic leading-relaxed">
              {post.metaDescription}
            </p>
          )}

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex items-center flex-wrap gap-1 mt-2">
              <Tag className="w-3 h-3 text-zinc-500" />
              {post.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-700/50 text-zinc-400 border border-zinc-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Blog Images */}
        {images.length > 0 && (
          <div className="px-4 pt-4 space-y-3">
            {images.map((img) => (
              <figure key={img.id} className="rounded-lg overflow-hidden border border-zinc-700">
                <img
                  src={img.publicUrl}
                  alt={img.altText || 'Blog image'}
                  className="w-full object-cover max-h-80"
                  loading="lazy"
                />
                {img.caption && (
                  <figcaption className="px-3 py-2 text-xs text-zinc-400 bg-zinc-800/50 italic">
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}

        {/* Markdown Content */}
        <div className="p-4">
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-strong:text-zinc-200 prose-a:text-blue-400 prose-li:text-zinc-300 prose-blockquote:border-purple-500 prose-blockquote:text-zinc-400">
            <ReactMarkdown>{post.contentMarkdown}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
