'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fetchJobStatus } from '@/lib/api/seo-jobs-api';
import type { JobExecution } from '@/lib/api/seo-jobs-api';

const JOB_DISPLAY_NAMES: Record<string, string> = {
  'seo-health-monitor-job': 'PrinterPix',
  'seo-inks-monitor-job': 'Inks',
};

function getDisplayName(jobName: string): string {
  return JOB_DISPLAY_NAMES[jobName] ?? jobName;
}

/** Only show executions from the last 48 hours */
function isRecent(createTime: string): boolean {
  const created = new Date(createTime);
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  return created >= cutoff;
}

/** Auto-hide SUCCEEDED executions after 5 minutes */
function isRecentlyCompleted(completionTime?: string): boolean {
  if (!completionTime) return false;
  const completed = new Date(completionTime);
  return Date.now() - completed.getTime() < 5 * 60 * 1000;
}

interface JobStatusBannerProps {
  onAuditComplete?: () => void;
  onHasRunningChange?: (hasRunning: boolean) => void;
}

export function JobStatusBanner({ onAuditComplete, onHasRunningChange }: JobStatusBannerProps) {
  const [executions, setExecutions] = useState<JobExecution[]>([]);
  const prevExecutionsRef = useRef<Map<string, JobExecution>>(new Map());
  const onAuditCompleteRef = useRef(onAuditComplete);
  const onHasRunningChangeRef = useRef(onHasRunningChange);

  useEffect(() => {
    onAuditCompleteRef.current = onAuditComplete;
    onHasRunningChangeRef.current = onHasRunningChange;
  }, [onAuditComplete, onHasRunningChange]);

  const poll = useCallback(async () => {
    try {
      const data = await fetchJobStatus();
      const prev = prevExecutionsRef.current;

      // Detect RUNNING → SUCCEEDED/FAILED transitions
      data.executions.forEach((exec) => {
        const previous = prev.get(exec.executionId);
        if (
          previous?.state === 'RUNNING' &&
          (exec.state === 'SUCCEEDED' || exec.state === 'FAILED')
        ) {
          onAuditCompleteRef.current?.();
        }
      });

      // Update ref map
      const next = new Map<string, JobExecution>();
      data.executions.forEach((e) => next.set(e.executionId, e));
      prevExecutionsRef.current = next;

      setExecutions(data.executions);
      onHasRunningChangeRef.current?.(data.hasRunning);
    } catch {
      // Silently ignore poll errors — banner is non-critical
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, [poll]);

  const visible = executions.filter((exec) => {
    if (!isRecent(exec.createTime)) return false;
    if (exec.state === 'RUNNING') return true;
    if (exec.state === 'FAILED' || exec.state === 'CANCELLED') return true;
    if (exec.state === 'SUCCEEDED') return isRecentlyCompleted(exec.completionTime);
    return false;
  });

  if (visible.length === 0) return null;

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50 px-4 py-2 space-y-1.5">
      {visible.map((exec) => (
        <ExecutionRow key={exec.executionId} exec={exec} />
      ))}
    </div>
  );
}

function ExecutionRow({ exec }: { exec: JobExecution }) {
  const displayName = getDisplayName(exec.jobName);

  if (exec.state === 'RUNNING') {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        <span>
          Audit running
          <span className="text-zinc-500 mx-1">·</span>
          <span className="text-zinc-300">{displayName}</span>
          <span className="text-zinc-500 mx-1">·</span>
          Started{' '}
          {formatDistanceToNow(new Date(exec.createTime), { addSuffix: true })}
        </span>
      </div>
    );
  }

  if (exec.state === 'SUCCEEDED') {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span>
          Audit completed
          <span className="text-zinc-500 mx-1">·</span>
          {exec.completionTime
            ? formatDistanceToNow(new Date(exec.completionTime), { addSuffix: true })
            : formatDistanceToNow(new Date(exec.createTime), { addSuffix: true })}
        </span>
      </div>
    );
  }

  if (exec.state === 'FAILED') {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span>
          Audit failed
          <span className="text-zinc-500 mx-1">·</span>
          <span className="text-zinc-300">{displayName}</span>
          <span className="text-zinc-500 mx-1">·</span>
          <span className="text-zinc-500">Check logs or retry</span>
        </span>
      </div>
    );
  }

  if (exec.state === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-500" />
        </span>
        <span>
          Audit cancelled
          <span className="text-zinc-500 mx-1">·</span>
          <span>{displayName}</span>
        </span>
      </div>
    );
  }

  return null;
}
