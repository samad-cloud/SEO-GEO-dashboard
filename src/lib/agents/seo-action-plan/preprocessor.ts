import type { IssueDigest, IssueGroup, PriorityIssue, IssueSummary, CategoryScore, PageSpeedSummary } from './types';

interface RawUrlIssue {
  issue_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description?: string;
  recommendation?: string;
  current_value?: string;
  expected_value?: string;
  status?: string;
}

interface RawUrlEntry {
  issues?: RawUrlIssue[];
  crawl?: Record<string, unknown>;
  pagespeed?: Record<string, unknown>;
  gsc?: Record<string, unknown>;
  security?: Record<string, unknown>;
}

// Shape of the raw GCS JSON — only the fields we need
interface RawAuditJson {
  domain: string;
  audit_date: string;
  health_score: number;
  issue_summary: {
    total_issues: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
  };
  category_scores: Record<string, {
    score: number;
    issue_count: number;
    status: string;
  }>;
  priority_issues?: PriorityIssue[];
  pagespeed_summary?: PageSpeedSummary;
  urls?: Record<string, RawUrlEntry>;
}

const SAMPLE_LIMIT = 3; // max sample URLs per issue group

/**
 * Aggregate raw audit JSON into a compact IssueDigest.
 * Processes the entire urls map without loading it all into a single variable —
 * iterates key-by-key to keep memory usage predictable.
 */
export function buildIssueDigest(raw: RawAuditJson): IssueDigest {
  // Map: `${issue_type}|||${severity}|||${category}` → { count, sample_urls }
  const groupMap = new Map<string, { count: number; severity: string; category: string; sample_urls: string[] }>();

  const urls = raw.urls ?? {};

  for (const [url, entry] of Object.entries(urls)) {
    if (!entry.issues) continue;

    for (const issue of entry.issues) {
      const key = `${issue.issue_type}|||${issue.severity}|||${issue.category}`;
      const existing = groupMap.get(key);

      if (existing) {
        existing.count++;
        if (existing.sample_urls.length < SAMPLE_LIMIT) {
          existing.sample_urls.push(url);
        }
      } else {
        groupMap.set(key, {
          count: 1,
          severity: issue.severity,
          category: issue.category,
          sample_urls: [url],
        });
      }
    }
  }

  // Convert map to sorted IssueGroup array (high count first)
  const issue_groups: IssueGroup[] = Array.from(groupMap.entries())
    .map(([key, val]) => {
      const [issue_type] = key.split('|||');
      return {
        issue_type,
        severity: val.severity as IssueGroup['severity'],
        category: val.category,
        count: val.count,
        sample_urls: val.sample_urls,
      };
    })
    .sort((a, b) => b.count - a.count);

  const issue_summary: IssueSummary = {
    total_issues: raw.issue_summary.total_issues,
    critical_count: raw.issue_summary.critical_count,
    high_count: raw.issue_summary.high_count,
    medium_count: raw.issue_summary.medium_count,
    low_count: raw.issue_summary.low_count,
  };

  const category_scores: Record<string, CategoryScore> = {};
  for (const [cat, val] of Object.entries(raw.category_scores)) {
    category_scores[cat] = {
      score: val.score,
      issue_count: val.issue_count,
      status: val.status,
    };
  }

  return {
    domain: raw.domain,
    audit_date: raw.audit_date,
    health_score: raw.health_score,
    issue_summary,
    category_scores,
    issue_groups,
    priority_issues: raw.priority_issues ?? [],
    pagespeed_summary: raw.pagespeed_summary ?? { urls_analyzed: 0 },
  };
}
