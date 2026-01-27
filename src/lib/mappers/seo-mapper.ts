import type { BigQuerySeoAuditRow } from '@/types/bigquery';
import type {
  AuditRun,
  AuditReport,
  DomainReport,
  AuditSummary,
  CategoryScore,
  CategoryStatus,
  IssueSummary,
} from '@/types/seo';

/**
 * Extract date value from BigQuery date field
 */
function extractDateValue(field: { value: string } | string | null): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.value;
}

/**
 * Parse date from BigQuery row
 */
function parseDate(row: BigQuerySeoAuditRow): Date {
  const dateValue = extractDateValue(row.audit_date);
  return new Date(dateValue);
}

/**
 * Determine category status based on score
 */
function getCategoryStatus(score: number | null): CategoryStatus {
  if (score === null) return 'poor';
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'needs-improvement';
  return 'poor';
}

/**
 * Map BigQuery rows to AuditRun array (for list view)
 * Groups multiple domain rows into single audit run
 */
export function mapRowsToAuditRuns(rows: BigQuerySeoAuditRow[]): AuditRun[] {
  // Group rows by audit_id
  const auditGroups = new Map<string, BigQuerySeoAuditRow[]>();

  for (const row of rows) {
    const existing = auditGroups.get(row.audit_id) || [];
    existing.push(row);
    auditGroups.set(row.audit_id, existing);
  }

  // Convert each group to AuditRun
  const runs: AuditRun[] = [];

  for (const [auditId, groupRows] of auditGroups) {
    const firstRow = groupRows[0];
    const domains = [...new Set(groupRows.map((r) => r.domain))];

    // Calculate aggregate stats across domains
    const totalIssues = groupRows.reduce((sum, r) => sum + (r.total_issues || 0), 0);
    const avgHealthScore =
      groupRows.reduce((sum, r) => sum + (r.health_score || 0), 0) / groupRows.length;

    // Estimate new issues as critical + high (since we don't have new_issues column)
    const newIssues = groupRows.reduce(
      (sum, r) => sum + (r.critical_count || 0) + (r.high_count || 0),
      0
    );

    runs.push({
      id: auditId,
      filename: `audit_report_${domains[0]}_${auditId}.json`,
      date: parseDate(firstRow),
      domains,
      healthScore: Math.round(avgHealthScore * 10) / 10,
      totalIssues,
      newIssues,
      duration: 0, // Not available in table
      status: 'completed',
    });
  }

  // Sort by date descending
  runs.sort((a, b) => b.date.getTime() - a.date.getTime());

  return runs;
}

/**
 * Map a BigQuery row to DomainReport
 */
function mapRowToDomainReport(row: BigQuerySeoAuditRow): DomainReport {
  const totalIssues = row.total_issues || 0;
  const criticalCount = row.critical_count || 0;
  const highCount = row.high_count || 0;
  const mediumCount = row.medium_count || 0;
  const lowCount = row.low_count || 0;

  const issueSummary: IssueSummary = {
    total_issues: totalIssues,
    new_issues: criticalCount + highCount, // Estimate
    fixed_issues: 0,
    regressed_issues: 0,
    critical_count: criticalCount,
    high_count: highCount,
    medium_count: mediumCount,
    low_count: lowCount,
    info_count: 0,
  };

  // Generate category scores based on health score (since we don't have per-category data)
  const healthScore = row.health_score || 0;
  const defaultCategory: CategoryScore = {
    score: healthScore,
    issue_count: Math.round(totalIssues / 8), // Distribute issues roughly
    status: getCategoryStatus(healthScore),
  };

  const categoryScores: Record<string, CategoryScore> = {
    crawlability: { ...defaultCategory },
    content: { ...defaultCategory },
    performance: { ...defaultCategory },
    security: { ...defaultCategory },
    mobile: { score: 100, issue_count: 0, status: 'excellent' },
    international: { score: 100, issue_count: 0, status: 'excellent' },
    links: { ...defaultCategory },
    schema: { ...defaultCategory },
  };

  return {
    domain: row.domain,
    audit_date: extractDateValue(row.audit_date),
    audit_timestamp: extractDateValue(row.audit_date),
    health_score: row.health_score || 0,
    duration_seconds: 0,
    issue_summary: issueSummary,
    category_scores: categoryScores,
    anomalies: [],
  };
}

/**
 * Map BigQuery rows to full AuditReport (for detail view)
 */
export function mapRowsToAuditReport(rows: BigQuerySeoAuditRow[]): AuditReport {
  if (rows.length === 0) {
    return {
      summary: {
        domains_audited: 0,
        average_health_score: 0,
        total_issues: 0,
        new_issues: 0,
        fixed_issues: 0,
        regressed_issues: 0,
        critical_issues: 0,
        anomalies: [],
        domain_scores: {},
        audit_date: '',
      },
      reports: [],
    };
  }

  const reports = rows.map(mapRowToDomainReport);

  // Calculate summary from all domain reports
  const domainScores: Record<string, number> = {};
  let totalIssues = 0;
  let criticalIssues = 0;

  for (const report of reports) {
    domainScores[report.domain] = report.health_score;
    totalIssues += report.issue_summary.total_issues;
    criticalIssues += report.issue_summary.critical_count;
  }

  const avgHealthScore =
    reports.reduce((sum, r) => sum + r.health_score, 0) / reports.length;

  // Estimate new issues as critical + high
  const newIssues = reports.reduce(
    (sum, r) => sum + r.issue_summary.critical_count + r.issue_summary.high_count,
    0
  );

  const summary: AuditSummary = {
    domains_audited: reports.length,
    average_health_score: Math.round(avgHealthScore * 10) / 10,
    total_issues: totalIssues,
    new_issues: newIssues,
    fixed_issues: 0,
    regressed_issues: 0,
    critical_issues: criticalIssues,
    anomalies: [],
    domain_scores: domainScores,
    audit_date: reports[0]?.audit_date || '',
  };

  return { summary, reports };
}
