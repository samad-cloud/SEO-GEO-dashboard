import { NextRequest, NextResponse } from 'next/server';
import {
  triggerJobsForDomains,
  hasRunningExecution,
  PRINTERPIX_DOMAINS,
  INKS_DOMAINS,
  JOB_PRINTERPIX,
  JOB_INKS,
} from '@/lib/gcp/cloud-run-jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const ALL_VALID_DOMAINS = new Set([...PRINTERPIX_DOMAINS, ...INKS_DOMAINS]);

interface TriggerRequestBody {
  domains: string[];
  skipAi?: boolean;
  skipEmail?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    let body: TriggerRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { domains, skipAi = false, skipEmail = false } = body;

    // Validate domains
    if (!Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        { error: 'domains must be a non-empty array of domain strings' },
        { status: 400 }
      );
    }

    const invalidDomains = domains.filter((d) => typeof d !== 'string' || !ALL_VALID_DOMAINS.has(d));
    if (invalidDomains.length > 0) {
      return NextResponse.json(
        { error: `Unknown domains: ${invalidDomains.join(', ')}` },
        { status: 400 }
      );
    }

    // Determine which jobs are relevant for the selected domains
    const needsPrinterpix = domains.some((d) => PRINTERPIX_DOMAINS.includes(d));
    const needsInks = domains.some((d) => INKS_DOMAINS.includes(d));

    // Check for running executions on all relevant jobs before triggering
    const runningChecks: Array<Promise<{ jobName: string; running: boolean }>> = [];

    if (needsPrinterpix) {
      runningChecks.push(
        hasRunningExecution(JOB_PRINTERPIX).then((running) => ({
          jobName: JOB_PRINTERPIX,
          running,
        }))
      );
    }
    if (needsInks) {
      runningChecks.push(
        hasRunningExecution(JOB_INKS).then((running) => ({ jobName: JOB_INKS, running }))
      );
    }

    const runningResults = await Promise.all(runningChecks);
    const alreadyRunning = runningResults.filter((r) => r.running);

    if (alreadyRunning.length > 0) {
      const jobName = alreadyRunning[0].jobName;
      return NextResponse.json(
        {
          error: `A job is already running for ${jobName}. Wait for it to complete before starting a new one.`,
        },
        { status: 409 }
      );
    }

    // Trigger the appropriate job(s)
    const result = await triggerJobsForDomains(domains, { skipAi, skipEmail });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
