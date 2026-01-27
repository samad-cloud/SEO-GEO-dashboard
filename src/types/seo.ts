// SEO Audit Types

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type CategoryStatus = 'excellent' | 'good' | 'needs-improvement' | 'poor';
export type IssueStatus = 'new' | 'existing' | 'fixed' | 'regressed';

export interface IssueSummary {
  total_issues: number;
  new_issues: number;
  fixed_issues: number;
  regressed_issues: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count?: number;
}

export interface CategoryScore {
  score: number;
  issue_count: number;
  status: CategoryStatus;
}

export interface SitemapInfo {
  sitemap_url: string;
  last_submitted: string;
  last_downloaded: string;
  is_pending: boolean;
  is_sitemap_index: boolean;
  warnings: number;
  errors: number;
  submitted: number;
  indexed: number;
  gap: number;
  indexation_rate: number;
}

export interface SitemapIndexation {
  sitemaps: SitemapInfo[];
  total_sitemaps: number;
  total_submitted: number;
  total_indexed: number;
  total_gap: number;
  total_indexation_rate: number;
  indexed_count_unreliable: boolean;
  note?: string;
}

export interface PriorityIssue {
  issue_type: string;
  url: string;
  severity: SeverityLevel;
  category: string;
  description: string;
  recommendation?: string;
  current_value?: string;
  expected_value?: string;
}

export interface CrawlSummary {
  urls_crawled: number;
  successful: number;
  soft_errors: number;
  valid_pages: number;
}

export interface PagespeedSummary {
  urls_analyzed: number;
  mobile_results: number;
  desktop_results: number;
}

export interface GSCSummary {
  urls_with_data: number;
}

export interface AiCriticalIssue {
  issue: string;
  impact: string;
  recommendation?: string;
}

export interface AiOptimization {
  issue: string;
  impact?: string;
  recommendation?: string;
}

export interface AiQuickWin {
  issue: string;
  effort?: string;
  impact?: string;
}

export interface AiRecommendation {
  priority: string;
  category: string;
  recommendation: string;
  expected_impact?: string;
}

export interface AiAnalysis {
  executive_summary?: {
    overview?: string;
    critical_issues?: AiCriticalIssue[];
    important_optimizations?: AiOptimization[];
    quick_wins?: AiQuickWin[];
  };
  recommendations?: AiRecommendation[];
}

export interface AllIssuesSummary {
  total_count: number;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
}

export interface DomainReport {
  domain: string;
  audit_date: string;
  audit_timestamp: string;
  health_score: number;
  duration_seconds: number;
  issue_summary: IssueSummary;
  category_scores: Record<string, CategoryScore>;
  anomalies: any[];
  sitemap_indexation?: SitemapIndexation;
  soft_errors?: { count: number; indexed_count: number };
  crawl_summary?: CrawlSummary;
  pagespeed_summary?: PagespeedSummary;
  gsc_summary?: GSCSummary;
  priority_issues?: PriorityIssue[];
  ai_analysis?: AiAnalysis;
  all_issues_summary?: AllIssuesSummary;
}

export interface AuditSummary {
  domains_audited: number;
  average_health_score: number;
  total_issues: number;
  new_issues: number;
  fixed_issues: number;
  regressed_issues: number;
  critical_issues: number;
  anomalies: any[];
  domain_scores: Record<string, number>;
  audit_date: string;
}

export interface AuditReport {
  summary: AuditSummary;
  reports: DomainReport[];
}

export interface AuditRun {
  id: string;
  filename: string;
  date: Date;
  domains: string[];
  healthScore: number;
  totalIssues: number;
  newIssues: number;
  duration: number;
  status: 'completed' | 'failed' | 'running';
}
