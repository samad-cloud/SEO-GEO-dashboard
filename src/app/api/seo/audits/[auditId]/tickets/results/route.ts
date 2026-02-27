import { NextRequest, NextResponse } from 'next/server';
import { getBigQueryClient, getTableName } from '@/lib/bigquery';
import { getStorageClient, parseGcsUri } from '@/lib/gcs';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ auditId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { auditId } = await params;

  if (!auditId) {
    return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
  }

  const bq = getBigQueryClient();
  const tableName = getTableName();

  const [rows] = await bq.query({
    query: `SELECT jira_tickets_gcs_path FROM \`${tableName}\` WHERE audit_id = @auditId LIMIT 1`,
    params: { auditId },
    location: 'US',
  });

  if (!rows.length || !rows[0].jira_tickets_gcs_path) {
    return NextResponse.json({ status: 'not_generated' });
  }

  const gcsUri = rows[0].jira_tickets_gcs_path as string;
  const parsed = parseGcsUri(gcsUri);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid GCS path' }, { status: 500 });
  }

  const storage = getStorageClient();
  const [contents] = await storage.bucket(parsed.bucket).file(parsed.path).download();
  const ticketsData = JSON.parse(contents.toString('utf-8'));

  return NextResponse.json({ status: 'complete', ...ticketsData });
}
