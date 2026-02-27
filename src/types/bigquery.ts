// BigQuery row types for SEO audit data
// Based on actual table schema: printerpix-general.GA_CG.seo_audit_results

export interface BigQuerySeoAuditRow {
  audit_id: string;
  domain: string;
  audit_date: { value: string } | string;
  health_score: number | null;
  total_issues: number | null;
  critical_count: number | null;
  high_count: number | null;
  medium_count: number | null;
  low_count: number | null;
  report_gcs_path: string | null;
  action_plan_gcs_path?: string | null;
  jira_tickets_gcs_path?: string | null;
}

export interface BigQueryPaginationParams {
  limit?: number;
  offset?: number;
}

export interface BigQueryFilterParams {
  domain?: string;
  startDate?: string;
  endDate?: string;
}
