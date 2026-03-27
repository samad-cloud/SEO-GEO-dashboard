import { NextRequest, NextResponse } from 'next/server';
import { listExecutions, JOB_PRINTERPIX, JOB_INKS } from '@/lib/gcp/cloud-run-jobs';
import type { JobExecution } from '@/lib/gcp/cloud-run-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);

    // Fetch recent executions from both jobs in parallel
    const [printerpixExecutions, inksExecutions] = await Promise.all([
      listExecutions(JOB_PRINTERPIX, limit),
      listExecutions(JOB_INKS, limit),
    ]);

    // Combine and sort by createTime descending
    const combined: JobExecution[] = [...printerpixExecutions, ...inksExecutions].sort(
      (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    );

    const executions = combined.slice(0, limit);
    const hasRunning = executions.some((e) => e.state === 'RUNNING');

    return NextResponse.json({ executions, hasRunning });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
