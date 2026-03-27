export interface DomainGroup {
  label: string;
  job: string;
  domains: string[];
}

export interface JobExecution {
  executionId: string;
  jobName: string;
  state: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';
  createTime: string;
  completionTime?: string;
}

export interface TriggerOptions {
  domains: string[];
  skipAi?: boolean;
  skipEmail?: boolean;
}

interface ApiError {
  error: string;
  details?: string;
}

/**
 * Fetch available domain groups for job triggering
 */
export async function fetchDomainGroups(): Promise<{ groups: DomainGroup[]; all: string[] }> {
  const response = await fetch('/api/seo/jobs/domains');

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || 'Failed to fetch domain groups');
  }

  return (await response.json()) as { groups: DomainGroup[]; all: string[] };
}

/**
 * Trigger audit jobs for the given domains
 */
export async function triggerAuditJobs(
  options: TriggerOptions
): Promise<{ executions: JobExecution[]; jobsTriggered: string[] }> {
  const response = await fetch('/api/seo/jobs/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || 'Failed to trigger audit jobs');
  }

  return (await response.json()) as { executions: JobExecution[]; jobsTriggered: string[] };
}

/**
 * Fetch current job execution status
 */
export async function fetchJobStatus(): Promise<{
  executions: JobExecution[];
  hasRunning: boolean;
}> {
  const response = await fetch('/api/seo/jobs/status');

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || 'Failed to fetch job status');
  }

  return (await response.json()) as { executions: JobExecution[]; hasRunning: boolean };
}
