import type { AuditRun, AuditReport } from '@/types/seo';

export interface PaginationInfo {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface AuditsListResponse {
  data: AuditRun[];
  pagination: PaginationInfo;
}

export interface AuditDetailResponse {
  run: AuditRun;
  report: AuditReport;
  gcs_path?: string | null;
}

export interface ApiError {
  error: string;
  details?: string;
}

/**
 * Fetch list of SEO audits with pagination
 */
export async function fetchAudits(options?: {
  limit?: number;
  offset?: number;
  domain?: string;
}): Promise<AuditsListResponse> {
  const params = new URLSearchParams();

  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  if (options?.domain) params.set('domain', options.domain);

  const url = `/api/seo/audits${params.toString() ? `?${params}` : ''}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || 'Failed to fetch audits');
  }

  const data = (await response.json()) as AuditsListResponse;

  // Parse dates from JSON
  data.data = data.data.map((run) => ({
    ...run,
    date: new Date(run.date),
  }));

  return data;
}

/**
 * Fetch single audit detail by ID
 */
export async function fetchAuditDetail(auditId: string): Promise<AuditDetailResponse> {
  const response = await fetch(`/api/seo/audits/${encodeURIComponent(auditId)}`);

  if (!response.ok) {
    const errorData = (await response.json()) as ApiError;
    throw new Error(errorData.error || 'Failed to fetch audit detail');
  }

  const data = (await response.json()) as AuditDetailResponse;

  // Parse dates from JSON
  data.run.date = new Date(data.run.date);

  return data;
}
