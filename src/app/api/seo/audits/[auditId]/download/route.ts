import { NextRequest, NextResponse } from 'next/server';
import { getBigQueryClient, getTableName } from '@/lib/bigquery';
import { getStorageClient, parseGcsUri } from '@/lib/gcs';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ auditId: string }>;
}

/**
 * GET /api/seo/audits/[auditId]/download
 * Streams the full GCS audit report file (including urls) as a download.
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

    // Download file contents from GCS
    const [contents] = await file.download();

    // Extract filename from GCS path for Content-Disposition
    const filename = parsed.path.split('/').pop() || `audit_${auditId}.json`;

    return new Response(contents.toString('utf-8'), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading audit report:', error);

    return NextResponse.json(
      {
        error: 'Failed to download audit report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
