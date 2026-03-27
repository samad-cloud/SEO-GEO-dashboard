import { GoogleAuth } from 'google-auth-library';

const PROJECT = 'printerpix-general';
const REGION = 'us-central1';
const BASE_URL = `https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}`;

// Job names
export const JOB_PRINTERPIX = 'seo-health-monitor-job';
export const JOB_INKS = 'seo-inks-monitor-job';

// Domain → job routing
export const PRINTERPIX_DOMAINS = [
  'printerpix.com',
  'printerpix.co.uk',
  'printerpix.de',
  'printerpix.fr',
  'printerpix.ae',
  'printerpix.es',
  'printerpix.it',
  'printerpix.nl',
];

export const INKS_DOMAINS = ['999inks.co.uk', 'clickinks.com', 'printerinks.com'];

// Types
export interface JobExecution {
  name: string;           // full resource name e.g. "projects/.../jobs/.../executions/abc"
  executionId: string;    // just the last segment
  jobName: string;        // 'seo-health-monitor-job' or 'seo-inks-monitor-job'
  state: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';
  createTime: string;
  completionTime?: string;
  domains?: string[];     // which domains were triggered
}

export interface TriggerResult {
  executions: JobExecution[];  // one per job triggered
  jobsTriggered: string[];
}

// Internal types for Cloud Run Jobs V2 API responses
interface ExecutionCondition {
  type: string;
  state: string;
  lastTransitionTime?: string;
}

interface CloudRunExecution {
  name: string;
  createTime?: string;
  completionTime?: string;
  startTime?: string;
  reconciling?: boolean;
  conditions?: ExecutionCondition[];
}

interface CloudRunOperation {
  metadata?: {
    name?: string;
  };
  name?: string;
}

interface CloudRunExecutionList {
  executions?: CloudRunExecution[];
}

// Singleton auth instance to avoid re-parsing credentials on every call
let _auth: GoogleAuth | null = null;

function getGoogleAuth(): GoogleAuth {
  if (_auth) return _auth;
  const credsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
  if (!credsBase64) throw new Error('GOOGLE_CREDENTIALS_BASE64 not set');
  const credentials = JSON.parse(Buffer.from(credsBase64, 'base64').toString('utf-8'));
  _auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  return _auth;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const auth = getGoogleAuth();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) throw new Error('Failed to obtain access token from Google Auth');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function mapExecutionState(execution: CloudRunExecution): JobExecution['state'] {
  const conditions = execution.conditions ?? [];
  const completedCondition = conditions.find((c) => c.type === 'Completed');

  if (completedCondition) {
    if (completedCondition.state === 'CONDITION_SUCCEEDED') return 'SUCCEEDED';
    if (completedCondition.state === 'CONDITION_FAILED') return 'FAILED';
  }

  // No completed condition → still running (or just started)
  return 'RUNNING';
}

function parseExecutionId(name: string): string {
  const parts = name.split('/');
  return parts[parts.length - 1];
}

function parseJobName(executionName: string): string {
  // Format: projects/.../jobs/{jobName}/executions/{executionId}
  const parts = executionName.split('/');
  const jobsIndex = parts.indexOf('jobs');
  if (jobsIndex !== -1 && parts[jobsIndex + 1]) {
    return parts[jobsIndex + 1];
  }
  return '';
}

function toJobExecution(execution: CloudRunExecution, domains?: string[]): JobExecution {
  return {
    name: execution.name,
    executionId: parseExecutionId(execution.name),
    jobName: parseJobName(execution.name),
    state: mapExecutionState(execution),
    createTime: execution.createTime ?? new Date().toISOString(),
    completionTime: execution.completionTime,
    domains,
  };
}

/**
 * Trigger a Cloud Run job with an optional domain override.
 * domains=null means run all configured domains (empty body).
 */
export async function triggerJob(
  jobName: string,
  domains: string[] | null,
  options?: { skipAi?: boolean; skipEmail?: boolean }
): Promise<JobExecution> {
  const headers = await getAuthHeaders();
  const url = `${BASE_URL}/jobs/${jobName}:run`;

  const args = ['python', 'main.py'];
  if (domains !== null) args.push('--domains', domains.join(','));
  if (options?.skipAi) args.push('--no-ai');
  if (options?.skipEmail) args.push('--no-email');

  const body =
    domains !== null || options?.skipAi || options?.skipEmail
      ? JSON.stringify({
          overrides: {
            containerOverrides: [{ args }],
          },
        })
      : JSON.stringify({});

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to trigger job ${jobName}: ${response.status} ${errorText}`);
  }

  const operation: CloudRunOperation = await response.json();

  // Extract execution name from the long-running operation metadata
  const executionName = operation.metadata?.name;
  if (!executionName) {
    throw new Error(`Trigger response missing metadata.name for job ${jobName}`);
  }

  const executionId = parseExecutionId(executionName);

  // Return a minimal JobExecution immediately — the job is now RUNNING
  return {
    name: executionName,
    executionId,
    jobName,
    state: 'RUNNING',
    createTime: new Date().toISOString(),
    domains: domains ?? undefined,
  };
}

/**
 * Get the status of a specific execution.
 */
export async function getExecution(jobName: string, executionId: string): Promise<JobExecution> {
  const headers = await getAuthHeaders();
  const url = `${BASE_URL}/jobs/${jobName}/executions/${executionId}`;

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get execution ${executionId} for job ${jobName}: ${response.status} ${errorText}`
    );
  }

  const execution: CloudRunExecution = await response.json();
  return toJobExecution(execution);
}

/**
 * List recent executions for a job (last N, default 10).
 */
export async function listExecutions(jobName: string, limit = 10): Promise<JobExecution[]> {
  const headers = await getAuthHeaders();
  const url = `${BASE_URL}/jobs/${jobName}/executions?pageSize=${limit}`;

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to list executions for job ${jobName}: ${response.status} ${errorText}`
    );
  }

  const data: CloudRunExecutionList = await response.json();
  return (data.executions ?? []).map((e) => toJobExecution(e));
}

/**
 * Check if a job has any currently RUNNING executions.
 */
export async function hasRunningExecution(jobName: string): Promise<boolean> {
  const executions = await listExecutions(jobName, 5);
  return executions.some((e) => e.state === 'RUNNING');
}

/**
 * Trigger the right job(s) based on selected domains.
 * If domains from both groups are selected → trigger both jobs.
 */
export async function triggerJobsForDomains(
  domains: string[],
  options?: { skipAi?: boolean; skipEmail?: boolean }
): Promise<TriggerResult> {
  const printerpixDomains = domains.filter((d) => PRINTERPIX_DOMAINS.includes(d));
  const inksDomains = domains.filter((d) => INKS_DOMAINS.includes(d));

  const triggers: Array<Promise<JobExecution>> = [];
  const jobsTriggered: string[] = [];

  if (printerpixDomains.length > 0) {
    triggers.push(triggerJob(JOB_PRINTERPIX, printerpixDomains, options));
    jobsTriggered.push(JOB_PRINTERPIX);
  }

  if (inksDomains.length > 0) {
    triggers.push(triggerJob(JOB_INKS, inksDomains, options));
    jobsTriggered.push(JOB_INKS);
  }

  if (triggers.length === 0) {
    throw new Error('No valid domains matched any known job');
  }

  const executions = await Promise.all(triggers);

  return { executions, jobsTriggered };
}
