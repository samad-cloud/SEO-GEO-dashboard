import { NextRequest, NextResponse } from 'next/server';
import { getBigQueryClient, getTableName } from '@/lib/bigquery';
import { fetchJsonFromGcs } from '@/lib/gcs';
import { mapRowsToAuditRuns } from '@/lib/mappers/seo-mapper';
import type { BigQuerySeoAuditRow } from '@/types/bigquery';
import type { AuditReport, DomainReport, AiAnalysis, AllIssuesSummary } from '@/types/seo';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ auditId: string }>;
}

// Shape of the JSON file stored in GCS
interface GcsAuditJson {
  summary?: {
    domains_audited?: number;
    average_health_score?: number;
    total_issues?: number;
    new_issues?: number;
    fixed_issues?: number;
    regressed_issues?: number;
    critical_issues?: number;
    anomalies?: unknown[];
    domain_scores?: Record<string, number>;
    audit_date?: string;
  };
  reports?: DomainReport[];
  // Single domain report format
  domain?: string;
  audit_date?: string;
  audit_timestamp?: string;
  health_score?: number;
  duration_seconds?: number;
  issue_summary?: DomainReport['issue_summary'];
  category_scores?: DomainReport['category_scores'];
  sitemap_indexation?: DomainReport['sitemap_indexation'];
  priority_issues?: DomainReport['priority_issues'];
  crawl_summary?: DomainReport['crawl_summary'];
  pagespeed_summary?: DomainReport['pagespeed_summary'];
  gsc_summary?: DomainReport['gsc_summary'];
  anomalies?: unknown[];
  soft_errors?: DomainReport['soft_errors'];
  ai_analysis?: AiAnalysis;
  all_issues_summary?: AllIssuesSummary;
  urls?: unknown;
}

/**
 * Convert a single-domain JSON to AuditReport format
 */
function normalizeSingleDomainReport(json: GcsAuditJson): AuditReport {
  const report: DomainReport = {
    domain: json.domain || 'unknown',
    audit_date: json.audit_date || '',
    audit_timestamp: json.audit_timestamp || json.audit_date || '',
    health_score: json.health_score || 0,
    duration_seconds: json.duration_seconds || 0,
    issue_summary: json.issue_summary || {
      total_issues: 0,
      new_issues: 0,
      fixed_issues: 0,
      regressed_issues: 0,
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
    },
    category_scores: json.category_scores || {},
    anomalies: json.anomalies || [],
    sitemap_indexation: json.sitemap_indexation,
    priority_issues: json.priority_issues,
    crawl_summary: json.crawl_summary,
    pagespeed_summary: json.pagespeed_summary,
    gsc_summary: json.gsc_summary,
    soft_errors: json.soft_errors,
    ai_analysis: json.ai_analysis,
    all_issues_summary: json.all_issues_summary,
  };

  return {
    summary: {
      domains_audited: 1,
      average_health_score: report.health_score,
      total_issues: report.issue_summary.total_issues,
      new_issues: report.issue_summary.new_issues,
      fixed_issues: report.issue_summary.fixed_issues,
      regressed_issues: report.issue_summary.regressed_issues,
      critical_issues: report.issue_summary.critical_count,
      anomalies: report.anomalies,
      domain_scores: { [report.domain]: report.health_score },
      audit_date: report.audit_date,
    },
    reports: [report],
  };
}

/**
 * Convert GCS JSON to AuditReport format
 */
function parseGcsReport(json: GcsAuditJson): AuditReport {
  // Check if it's a multi-domain format with summary
  if (json.summary && json.reports) {
    return {
      summary: {
        domains_audited: json.summary.domains_audited || json.reports.length,
        average_health_score: json.summary.average_health_score || 0,
        total_issues: json.summary.total_issues || 0,
        new_issues: json.summary.new_issues || 0,
        fixed_issues: json.summary.fixed_issues || 0,
        regressed_issues: json.summary.regressed_issues || 0,
        critical_issues: json.summary.critical_issues || 0,
        anomalies: json.summary.anomalies || [],
        domain_scores: json.summary.domain_scores || {},
        audit_date: json.summary.audit_date || '',
      },
      reports: json.reports,
    };
  }

  // Single domain format
  return normalizeSingleDomainReport(json);
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { auditId } = await params;

    if (!auditId) {
      return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
    }

    const client = getBigQueryClient();
    const tableName = getTableName();

    // Fetch rows for this audit including GCS path
    const query = `
      SELECT
        audit_id,
        domain,
        audit_date,
        health_score,
        total_issues,
        critical_count,
        high_count,
        medium_count,
        low_count,
        report_gcs_path
      FROM \`${tableName}\`
      WHERE audit_id = @auditId
      ORDER BY domain
    `;

    const [rows] = await client.query({
      query,
      params: { auditId },
      location: 'US',
    });

    const typedRows = rows as BigQuerySeoAuditRow[];

    if (typedRows.length === 0) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    // Map to AuditRun for basic info
    const runs = mapRowsToAuditRuns(typedRows);
    const run = runs[0];

    // Try to fetch full report from GCS
    let report: AuditReport;

    // Find first row with a GCS path
    const rowWithPath = typedRows.find((r) => r.report_gcs_path);

    const gcsPath = rowWithPath?.report_gcs_path || null;

    if (gcsPath) {
      try {
        const gcsJson = await fetchJsonFromGcs<GcsAuditJson>(gcsPath);

        // Strip bulky urls field before sending to browser (can be 40-80MB)
        delete gcsJson.urls;
        if (gcsJson.reports) {
          for (const r of gcsJson.reports) {
            delete (r as unknown as Record<string, unknown>).urls;
          }
        }

        report = parseGcsReport(gcsJson);

        // Update run with accurate data from GCS
        if (report.summary) {
          run.totalIssues = report.summary.total_issues;
          run.newIssues = report.summary.new_issues;
          run.healthScore = report.summary.average_health_score;
        }
        if (report.reports[0]?.duration_seconds) {
          run.duration = report.reports[0].duration_seconds;
        }
      } catch (gcsError) {
        console.error('Failed to fetch from GCS, using BigQuery data:', gcsError);
        // Fall back to BigQuery-derived report
        const { mapRowsToAuditReport } = await import('@/lib/mappers/seo-mapper');
        report = mapRowsToAuditReport(typedRows);
      }
    } else {
      // No GCS path, use BigQuery data
      const { mapRowsToAuditReport } = await import('@/lib/mappers/seo-mapper');
      report = mapRowsToAuditReport(typedRows);
    }

    return NextResponse.json({
      run,
      report,
      gcs_path: gcsPath,
    });
  } catch (error) {
    console.error('Error fetching audit:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch audit detail',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
