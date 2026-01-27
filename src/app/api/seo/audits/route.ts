import { NextRequest, NextResponse } from 'next/server';
import { getBigQueryClient, getTableName } from '@/lib/bigquery';
import { mapRowsToAuditRuns } from '@/lib/mappers/seo-mapper';
import type { BigQuerySeoAuditRow } from '@/types/bigquery';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const domain = searchParams.get('domain');

    const client = getBigQueryClient();
    const tableName = getTableName();

    // Query only columns that exist in the table
    let query = `
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
    `;

    const params: Record<string, string> = {};

    if (domain) {
      query += ` WHERE domain = @domain`;
      params.domain = domain;
    }

    query += ` ORDER BY audit_date DESC`;

    const [rows] = await client.query({
      query,
      params,
      location: 'US',
    });

    const typedRows = rows as BigQuerySeoAuditRow[];

    // Map to AuditRun format (groups by audit_id)
    const allRuns = mapRowsToAuditRuns(typedRows);

    // Apply pagination after grouping
    const paginatedRuns = allRuns.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedRuns,
      pagination: {
        limit,
        offset,
        total: allRuns.length,
        hasMore: offset + limit < allRuns.length,
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
