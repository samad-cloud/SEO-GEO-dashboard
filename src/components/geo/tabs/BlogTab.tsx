'use client';

import { Play, Loader2 } from 'lucide-react';
import { useCrewRun } from '@/hooks/use-crew-run';
import { BlogPostsSection } from '@/components/geo/sections/BlogPostsSection';

interface BlogTabProps {
  crewData: any;
  region: string;
  onRefresh: () => void;
}

export function BlogTab({ crewData, region, onRefresh }: BlogTabProps) {
  const { isRunning, lastStatus, error, start } = useCrewRun('blog', region);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Blog Content</h2>
        <button
          onClick={async () => { const ok = await start(); if (ok) onRefresh(); }}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm transition-colors"
        >
          {isRunning ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running...</>
          ) : (
            <><Play className="w-3.5 h-3.5" />Run Blog Crew</>
          )}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {lastStatus === 'complete' && (
        <p className="text-xs text-green-400">Blog crew complete. Refresh to see results.</p>
      )}
      <BlogPostsSection
        briefs={crewData?.briefs ?? []}
        posts={crewData?.blogPosts ?? []}
      />
    </div>
  );
}
