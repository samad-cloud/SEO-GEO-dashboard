export interface IssueGroup {
  issue_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  count: number;
  sample_urls: string[];
}

export interface CategoryScore {
  score: number;
  issue_count: number;
  status: string;
}

export interface PageSpeedSummary {
  urls_analyzed: number;
  mobile_results?: {
    avg_lcp_ms?: number;
    avg_cls?: number;
    avg_inp_ms?: number;
    poor_lcp_count?: number;
    poor_cls_count?: number;
    poor_inp_count?: number;
  };
  desktop_results?: {
    avg_lcp_ms?: number;
    avg_cls?: number;
    avg_inp_ms?: number;
    poor_lcp_count?: number;
    poor_cls_count?: number;
    poor_inp_count?: number;
  };
}

export interface PriorityIssue {
  issue_type: string;
  url: string;
  severity: string;
  category: string;
  description: string;
  recommendation: string;
}

export interface IssueSummary {
  total_issues: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

export interface IssueDigest {
  domain: string;
  audit_date: string;
  health_score: number;
  issue_summary: IssueSummary;
  category_scores: Record<string, CategoryScore>;
  issue_groups: IssueGroup[];
  priority_issues: PriorityIssue[];
  pagespeed_summary: PageSpeedSummary;
}
