import { NextRequest, NextResponse } from 'next/server';
import { getBigQueryClient, getTableName } from '@/lib/bigquery';
import { getStorageClient, parseGcsUri } from '@/lib/gcs';
import { buildIssueDigest } from '@/lib/agents/seo-action-plan/preprocessor';
import { runActionPlanAgent } from '@/lib/agents/seo-action-plan/agent';

export const dynamic = 'force-dynamic';
// Increase timeout — agent can take 30-90 seconds
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ auditId: string }>;
}

interface AuditRow {
  report_gcs_path: string | null;
  action_plan_gcs_path: string | null;
  domain: string;
  audit_date: { value: string } | string;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { auditId } = await params;

  if (!auditId) {
    return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
  }

  try {
    const bq = getBigQueryClient();
    const tableName = getTableName();

    // 1. Look up the audit row
    const [rows] = await bq.query({
      query: `
        SELECT report_gcs_path, action_plan_gcs_path, domain, audit_date
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

    // 2. Return early if already generated
    if (row.action_plan_gcs_path) {
      return NextResponse.json({
        status: 'exists',
        actionPlanGcsPath: row.action_plan_gcs_path,
        auditId,
      });
    }

    if (!row.report_gcs_path) {
      return NextResponse.json(
        { error: 'No GCS report found for this audit — cannot generate action plan' },
        { status: 422 }
      );
    }

    // 3. Download the raw GCS JSON
    const parsed = parseGcsUri(row.report_gcs_path);
    if (!parsed) {
      throw new Error(`Invalid GCS URI: ${row.report_gcs_path}`);
    }

    const storage = getStorageClient();
    const [contents] = await storage.bucket(parsed.bucket).file(parsed.path).download();
    const rawJson = JSON.parse(contents.toString('utf-8'));

    // 4. Pre-process into compact IssueDigest (no LLM, pure aggregation)
    const digest = buildIssueDigest(rawJson);

    // 5. Run LangChain agent → get ACTION-PLAN.md markdown
    const actionPlanMarkdown = await runActionPlanAgent(digest);

    // 6. Upload ACTION-PLAN.md to GCS (same bucket as the raw report)
    const auditDate = typeof row.audit_date === 'object' ? row.audit_date.value : row.audit_date;
    const gcsPath = `action-plans/${row.domain}/${auditDate}/ACTION-PLAN.md`;
    const bucket = storage.bucket(parsed.bucket);
    await bucket.file(gcsPath).save(actionPlanMarkdown, {
      contentType: 'text/markdown; charset=utf-8',
    });
    const actionPlanGcsPath = `gs://${parsed.bucket}/${gcsPath}`;

    // 7. Write action_plan_gcs_path back to BigQuery
    await bq.query({
      query: `
        UPDATE \`${tableName}\`
        SET action_plan_gcs_path = @path
        WHERE audit_id = @auditId
      `,
      params: { path: actionPlanGcsPath, auditId },
      location: 'US',
    });

    return NextResponse.json({
      status: 'complete',
      actionPlanGcsPath,
      auditId,
    });
  } catch (error) {
    console.error('Action plan generation failed:', error);
    return NextResponse.json(
      {
        error: 'Action plan generation failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
