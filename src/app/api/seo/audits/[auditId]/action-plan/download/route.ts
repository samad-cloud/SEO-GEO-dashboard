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

  try {
    const bq = getBigQueryClient();
    const tableName = getTableName();

    const [rows] = await bq.query({
      query: `SELECT action_plan_gcs_path FROM \`${tableName}\` WHERE audit_id = @auditId LIMIT 1`,
      params: { auditId },
      location: 'US',
    });

    if (!rows.length || !rows[0].action_plan_gcs_path) {
      return NextResponse.json(
        { error: 'Action plan not found — generate it first via POST /action-plan' },
        { status: 404 }
      );
    }

    const gcsUri = rows[0].action_plan_gcs_path as string;
    const parsed = parseGcsUri(gcsUri);

    if (!parsed) {
      return NextResponse.json({ error: 'Invalid GCS path stored for this action plan' }, { status: 500 });
    }

    const storage = getStorageClient();
    const [contents] = await storage.bucket(parsed.bucket).file(parsed.path).download();

    return new Response(contents.toString('utf-8'), {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="ACTION-PLAN-${auditId}.md"`,
      },
    });
  } catch (error) {
    console.error('Error downloading action plan:', error);
    return NextResponse.json(
      {
        error: 'Failed to download action plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
