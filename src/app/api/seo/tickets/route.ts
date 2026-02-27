import { NextResponse } from 'next/server';
import { getBigQueryClient, BIGQUERY_PROJECT_ID, BIGQUERY_DATASET, BIGQUERY_TABLE } from '@/lib/bigquery';
import { getStorageClient, parseGcsUri, fetchJsonFromGcs } from '@/lib/gcs';
import { groupIssuesAcrossDomains } from '@/lib/agents/ticket-creation/cross-domain-grouper';
import { runTicketCreationPipeline } from '@/lib/agents/ticket-creation/pipeline';
import type { RawAuditJson } from '@/lib/agents/ticket-creation/types';

export const dynamic = 'force-dynamic';
// Cross-domain pipeline can take several minutes (multiple domains × issue groups × 3 parallel)
export const maxDuration = 300;

const COMBINED_RUNS_TABLE = `\`${BIGQUERY_PROJECT_ID}.${BIGQUERY_DATASET}.seo_combined_ticket_runs\``;
const AUDIT_TABLE = `\`${BIGQUERY_PROJECT_ID}.${BIGQUERY_DATASET}.${BIGQUERY_TABLE}\``;

interface AuditRow {
  audit_id: string;
  domain: string;
  report_gcs_path: string | null;
  audit_date: { value: string } | string;
}

interface CombinedRunRow {
  run_date: string;
  gcs_path: string | null;
  created_at: { value: string } | string | null;
}

function resolveDate(val: { value: string } | string | null | undefined): string {
  if (!val) return '';
  if (typeof val === 'object' && 'value' in val) return val.value;
  return val;
}

/**
 * GET /api/seo/tickets
 * Returns results for the most recent combined ticket run, or a not_generated status.
 */
export async function GET() {
  const bq = getBigQueryClient();

  // Ensure the combined runs table exists
  await bq.query({
    query: `
      CREATE TABLE IF NOT EXISTS ${COMBINED_RUNS_TABLE} (
        run_date STRING NOT NULL,
        gcs_path STRING,
        created_at TIMESTAMP
      )
    `,
    location: 'US',
  });

  // Find most recent combined run
  const [runRows] = await bq.query({
    query: `
      SELECT run_date, gcs_path, created_at
      FROM ${COMBINED_RUNS_TABLE}
      ORDER BY run_date DESC
      LIMIT 1
    `,
    location: 'US',
  });

  // Also get the latest audit date for display
  const [dateRows] = await bq.query({
    query: `
      SELECT MAX(CAST(audit_date AS STRING)) AS latest_date
      FROM ${AUDIT_TABLE}
    `,
    location: 'US',
  });
  const latestDate = (dateRows[0] as { latest_date: string | null })?.latest_date ?? null;

  if (!runRows.length) {
    return NextResponse.json({ status: 'not_generated', latestDate });
  }

  const runRow = runRows[0] as CombinedRunRow;
  const gcsPath = runRow.gcs_path;

  if (!gcsPath) {
    return NextResponse.json({ status: 'not_generated', latestDate });
  }

  try {
    const ticketsData = await fetchJsonFromGcs<Record<string, unknown>>(gcsPath);
    return NextResponse.json({
      status: 'complete',
      runDate: runRow.run_date,
      gcsPath,
      ...ticketsData,
    });
  } catch (error) {
    console.error('[tickets GET] Failed to load GCS data:', error);
    return NextResponse.json({ status: 'not_generated', latestDate });
  }
}

/**
 * POST /api/seo/tickets
 * Runs the combined cross-domain ticket creation pipeline for the latest audit date.
 */
export async function POST() {
  const bq = getBigQueryClient();

  // Ensure the combined runs table exists
  await bq.query({
    query: `
      CREATE TABLE IF NOT EXISTS ${COMBINED_RUNS_TABLE} (
        run_date STRING NOT NULL,
        gcs_path STRING,
        created_at TIMESTAMP
      )
    `,
    location: 'US',
  });

  // 1. Find the most recent audit_date across all domains
  const [dateRows] = await bq.query({
    query: `
      SELECT MAX(CAST(audit_date AS STRING)) AS latest_date
      FROM ${AUDIT_TABLE}
    `,
    location: 'US',
  });

  const latestDate = (dateRows[0] as { latest_date: string | null })?.latest_date;
  if (!latestDate) {
    return NextResponse.json({ error: 'No audits found in BigQuery' }, { status: 404 });
  }

  // 2. Idempotency: check if we already ran for this date
  const [existingRows] = await bq.query({
    query: `
      SELECT run_date, gcs_path
      FROM ${COMBINED_RUNS_TABLE}
      WHERE run_date = @runDate
      LIMIT 1
    `,
    params: { runDate: latestDate },
    location: 'US',
  });

  if (existingRows.length) {
    const existing = existingRows[0] as { run_date: string; gcs_path: string };
    return NextResponse.json({
      status: 'exists',
      runId: existing.run_date,
      gcsPath: existing.gcs_path,
    });
  }

  // 3. Fetch all audit rows for the latest date
  const [auditRows] = await bq.query({
    query: `
      SELECT audit_id, domain, report_gcs_path, audit_date
      FROM ${AUDIT_TABLE}
      WHERE CAST(audit_date AS STRING) = @latestDate
        AND report_gcs_path IS NOT NULL
    `,
    params: { latestDate },
    location: 'US',
  });

  if (!auditRows.length) {
    return NextResponse.json(
      { error: `No audit rows with GCS reports found for date ${latestDate}` },
      { status: 404 }
    );
  }

  // 4. Download each audit's raw JSON from GCS
  const storage = getStorageClient();
  let bucket = '';

  const auditInputs = await Promise.all(
    (auditRows as AuditRow[]).map(async (row) => {
      const gcsUri = row.report_gcs_path!;
      const parsed = parseGcsUri(gcsUri);
      if (!parsed) throw new Error(`Invalid GCS URI: ${gcsUri}`);

      if (!bucket) bucket = parsed.bucket;

      const [contents] = await storage.bucket(parsed.bucket).file(parsed.path).download();
      const rawJson = JSON.parse(contents.toString('utf-8')) as RawAuditJson;

      return {
        auditId: row.audit_id,
        domain: row.domain,
        rawJson,
      };
    })
  );

  if (!bucket) {
    return NextResponse.json({ error: 'Could not determine GCS bucket' }, { status: 500 });
  }

  try {
    // 5. Group issues across all domains
    const issueGroups = groupIssuesAcrossDomains(auditInputs);
    console.log(
      `[combined-tickets] Grouped ${issueGroups.length} cross-domain issue types from ${auditInputs.length} domains`
    );

    // 6. Run the pipeline
    const result = await runTicketCreationPipeline(latestDate, issueGroups, bucket);

    // 7. Insert into seo_combined_ticket_runs
    await bq.query({
      query: `
        INSERT INTO ${COMBINED_RUNS_TABLE} (run_date, gcs_path, created_at)
        VALUES (@runDate, @gcsPath, CURRENT_TIMESTAMP())
      `,
      params: { runDate: latestDate, gcsPath: result.gcsPath },
      location: 'US',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[combined-tickets POST] Pipeline failed:', error);
    return NextResponse.json(
      {
        error: 'Combined ticket creation pipeline failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
