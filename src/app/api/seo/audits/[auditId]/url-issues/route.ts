import { NextRequest, NextResponse } from 'next/server';
import { getBigQueryClient, getTableName } from '@/lib/bigquery';
import { getStorageClient, parseGcsUri } from '@/lib/gcs';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ auditId: string }>;
}

interface UrlIssue {
  issue_type: string;
  severity: string;
  category: string;
  description: string;
  recommendation?: string;
  current_value?: string;
  expected_value?: string;
  status?: string;
}

interface UrlEntry {
  crawl?: {
    status_code?: number;
    title?: string;
    is_indexable?: boolean;
    response_time_ms?: number;
    word_count?: number;
  };
  gsc?: {
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
    is_indexed?: boolean;
  } | null;
  issues?: UrlIssue[];
  [key: string]: unknown;
}

/**
 * GET /api/seo/audits/[auditId]/url-issues
 * Fetches the full GCS report server-side and returns only the
 * URL-level data (crawl basics, GSC basics, issues) — stripping
 * heavy fields like pagespeed, security details, raw HTML, etc.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { auditId } = await params;

    if (!auditId) {
      return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
    }

    // Look up GCS path from BigQuery
    const client = getBigQueryClient();
    const tableName = getTableName();

    const query = `
      SELECT report_gcs_path
      FROM \`${tableName}\`
      WHERE audit_id = @auditId
        AND report_gcs_path IS NOT NULL
      LIMIT 1
    `;

    const [rows] = await client.query({
      query,
      params: { auditId },
      location: 'US',
    });

    const typedRows = rows as { report_gcs_path: string }[];

    if (typedRows.length === 0 || !typedRows[0].report_gcs_path) {
      return NextResponse.json(
        { error: 'No GCS report found for this audit' },
        { status: 404 }
      );
    }

    const gcsUri = typedRows[0].report_gcs_path;
    const parsed = parseGcsUri(gcsUri);

    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GCS path stored for this audit' },
        { status: 500 }
      );
    }

    const storage = getStorageClient();
    const file = storage.bucket(parsed.bucket).file(parsed.path);

    const [contents] = await file.download();
    const fullReport = JSON.parse(contents.toString('utf-8'));

    // Extract urls from top-level or from first report entry
    const rawUrls: Record<string, UrlEntry> | undefined =
      fullReport.urls ??
      fullReport.reports?.[0]?.urls;

    if (!rawUrls || Object.keys(rawUrls).length === 0) {
      return NextResponse.json({ urls: null });
    }

    // Strip heavy fields — keep only crawl basics, GSC basics, and issues
    const lightUrls: Record<string, {
      crawl?: UrlEntry['crawl'];
      gsc?: UrlEntry['gsc'];
      issues: UrlIssue[];
    }> = {};

    for (const [url, entry] of Object.entries(rawUrls)) {
      lightUrls[url] = {
        crawl: entry.crawl
          ? {
              status_code: entry.crawl.status_code,
              title: entry.crawl.title,
              is_indexable: entry.crawl.is_indexable,
              response_time_ms: entry.crawl.response_time_ms,
              word_count: entry.crawl.word_count,
            }
          : undefined,
        gsc: entry.gsc
          ? {
              clicks: entry.gsc.clicks,
              impressions: entry.gsc.impressions,
              ctr: entry.gsc.ctr,
              position: entry.gsc.position,
              is_indexed: entry.gsc.is_indexed,
            }
          : undefined,
        issues: (entry.issues ?? []).map((i) => ({
          issue_type: i.issue_type,
          severity: i.severity,
          category: i.category,
          description: i.description,
          recommendation: i.recommendation,
          current_value: i.current_value,
          expected_value: i.expected_value,
          status: i.status,
        })),
      };
    }

    return NextResponse.json({ urls: lightUrls });
  } catch (error) {
    console.error('Error fetching URL issues:', error);

    return NextResponse.json(
      {
        error: 'Failed to load URL issues',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
