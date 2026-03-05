import { NextRequest, NextResponse } from 'next/server';
import { getBigQueryClient, getTableName } from '@/lib/bigquery';
import { mapRowsToAuditRuns } from '@/lib/mappers/seo-mapper';
import type { BigQuerySeoAuditRow } from '@/types/bigquery';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const domain = searchParams.get('domain');

    const client = getBigQueryClient();
    const tableName = getTableName();

    const params: Record<string, string | number> = {};
    const domainFilter = domain ? 'WHERE domain = @domain' : '';
    if (domain) params.domain = domain;

    // Get total count of distinct audit_ids
    const countQuery = `
      SELECT COUNT(DISTINCT audit_id) AS total
      FROM \`${tableName}\`
      ${domainFilter}
    `;

    // Fetch only rows for the requested page of audit_ids, limited at SQL level
    const rowsPerAudit = 10; // max domains per audit
    const sqlLimit = (offset + limit) * rowsPerAudit;
    params.sqlLimit = sqlLimit;

    const dataQuery = `
      SELECT
        audit_id,
        domain,
        audit_date,
        health_score,
        total_issues,
        critical_count,
        high_count,
        medium_count,
        low_count
      FROM \`${tableName}\`
      WHERE audit_id IN (
        SELECT audit_id FROM (
          SELECT audit_id, MAX(CAST(audit_date AS STRING)) AS latest_date
          FROM \`${tableName}\`
          ${domainFilter}
          GROUP BY audit_id
          ORDER BY latest_date DESC
          LIMIT @sqlLimit
        )
      )
      ORDER BY audit_date DESC
    `;

    const [[countRows], [dataRows]] = await Promise.all([
      client.query({ query: countQuery, params: domain ? { domain } : {}, location: 'US' }),
      client.query({ query: dataQuery, params, location: 'US' }),
    ]);

    const total = Number((countRows[0] as { total: { value: string } | number })?.total?.valueOf?.() ?? (countRows[0] as { total: number })?.total ?? 0);
    const typedRows = dataRows as BigQuerySeoAuditRow[];

    // Map to AuditRun format (groups by audit_id)
    const allRuns = mapRowsToAuditRuns(typedRows);

    // Apply pagination after grouping
    const paginatedRuns = allRuns.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedRuns,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('BigQuery error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch audit data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
