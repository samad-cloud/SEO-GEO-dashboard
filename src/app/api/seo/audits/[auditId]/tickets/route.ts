import { NextRequest, NextResponse } from 'next/server';
import { getBigQueryClient, getTableName } from '@/lib/bigquery';
import { getStorageClient, parseGcsUri } from '@/lib/gcs';
import { runTicketCreationPipeline } from '@/lib/agents/ticket-creation/pipeline';
import type { RawAuditJson } from '@/lib/agents/ticket-creation/types';

export const dynamic = 'force-dynamic';
// Agent pipeline can take several minutes for large audits (20+ issue groups × 3 parallel)
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ auditId: string }>;
}

interface AuditRow {
  report_gcs_path: string | null;
  jira_tickets_gcs_path: string | null;
  domain: string;
  audit_date: { value: string } | string;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { auditId } = await params;

  if (!auditId) {
    return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
  }

  const bq = getBigQueryClient();
  const tableName = getTableName();

  // 1. Look up the audit row
  const [rows] = await bq.query({
    query: `
      SELECT report_gcs_path, jira_tickets_gcs_path, domain, audit_date
      FROM \`${tableName}\`
      WHERE audit_id = @auditId
      LIMIT 1
    `,
    params: { auditId },
    location: 'US',
  });

  if (!rows.length) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  const row = rows[0] as AuditRow;

  // 2. Idempotency — return early if tickets already created
  if (row.jira_tickets_gcs_path) {
    return NextResponse.json({
      status: 'exists',
      gcsPath: row.jira_tickets_gcs_path,
      auditId,
    });
  }

  if (!row.report_gcs_path) {
    return NextResponse.json(
      {
        error: 'No GCS report found for this audit — cannot create tickets without the raw audit JSON',
      },
      { status: 422 }
    );
  }

  try {
    // 3. Download raw audit JSON from GCS
    const parsed = parseGcsUri(row.report_gcs_path);
    if (!parsed) {
      throw new Error(`Invalid GCS URI: ${row.report_gcs_path}`);
    }

    const storage = getStorageClient();
    const [contents] = await storage
      .bucket(parsed.bucket)
      .file(parsed.path)
      .download();

    const rawJson = JSON.parse(contents.toString('utf-8')) as RawAuditJson;

    // 4. Resolve audit date string
    const auditDate =
      typeof row.audit_date === 'object' && row.audit_date !== null
        ? row.audit_date.value
        : row.audit_date;

    // 5. Run the 3-stage pipeline
    const result = await runTicketCreationPipeline(
      auditId,
      rawJson,
      row.domain,
      auditDate,
      parsed.bucket
    );

    // 6. Store GCS path back in BigQuery for idempotency
    await bq.query({
      query: `
        UPDATE \`${tableName}\`
        SET jira_tickets_gcs_path = @path
        WHERE audit_id = @auditId
      `,
      params: { path: result.gcsPath, auditId },
      location: 'US',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[tickets route] Pipeline failed:', error);
    return NextResponse.json(
      {
        error: 'Ticket creation pipeline failed',
        details:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
