#!/usr/bin/env node
/**
 * Cleanup script — deletes all Jira tickets for a given audit ID
 * and clears jira_tickets_gcs_path in BigQuery so you can re-run the pipeline.
 *
 * Usage:   node scripts/cleanup-test-tickets.mjs <auditId>
 * Example: node scripts/cleanup-test-tickets.mjs printerpix.it_20260225_235101
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = join(__dirname, '..', '.env');
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx);
    const value = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

// ── Validate arguments ────────────────────────────────────────────────────────

const auditId = process.argv[2];
if (!auditId) {
  console.error('Usage: node scripts/cleanup-test-tickets.mjs <auditId>');
  console.error('Example: node scripts/cleanup-test-tickets.mjs printerpix.it_20260225_235101');
  process.exit(1);
}

// ── Config ───────────────────────────────────────────────────────────────────

const jiraBaseUrl = process.env.JIRA_BASE_URL;
const jiraEmail = process.env.JIRA_EMAIL;
const jiraApiKey = process.env.JIRA_API_KEY;
const jiraAuth = `Basic ${Buffer.from(`${jiraEmail}:${jiraApiKey}`).toString('base64')}`;

const bqProject = process.env.BIGQUERY_PROJECT_ID;
const bqDataset = process.env.BIGQUERY_DATASET;
const bqTable = process.env.BIGQUERY_TABLE;
const tableName = `\`${bqProject}.${bqDataset}.${bqTable}\``;

const credBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
if (!credBase64) throw new Error('GOOGLE_CREDENTIALS_BASE64 not set');
const creds = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf-8'));

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { BigQuery } = await import('@google-cloud/bigquery');
  const { Storage } = await import('@google-cloud/storage');

  const bq = new BigQuery({ projectId: bqProject, credentials: creds });
  const storage = new Storage({ projectId: bqProject, credentials: creds });

  // 1. Get GCS path from BigQuery
  console.log(`\nFetching ticket data for audit: ${auditId}`);
  const [rows] = await bq.query({
    query: `SELECT jira_tickets_gcs_path FROM ${tableName} WHERE audit_id = @auditId LIMIT 1`,
    params: { auditId },
    location: 'US',
  });

  if (!rows.length || !rows[0].jira_tickets_gcs_path) {
    console.log('No ticket data found for this audit. Nothing to clean up.');
    process.exit(0);
  }

  const gcsUri = rows[0].jira_tickets_gcs_path;
  console.log(`GCS path: ${gcsUri}`);

  // 2. Download the tickets JSON from GCS
  const gcsMatch = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!gcsMatch) throw new Error(`Invalid GCS URI: ${gcsUri}`);
  const [, bucket, objectPath] = gcsMatch;

  const [contents] = await storage.bucket(bucket).file(objectPath).download();
  const ticketsData = JSON.parse(contents.toString('utf-8'));
  const tickets = ticketsData.tickets ?? [];

  console.log(`\nFound ${tickets.length} Jira tickets to delete:`);
  for (const t of tickets) {
    console.log(`  ${t.issueKey}  (${t.issueType})`);
  }

  if (tickets.length === 0) {
    console.log('No tickets to delete from Jira.');
  } else {
    console.log('\nDeleting from Jira...');
    for (const ticket of tickets) {
      const { issueKey } = ticket;
      const response = await fetch(`${jiraBaseUrl}/rest/api/3/issue/${issueKey}`, {
        method: 'DELETE',
        headers: { Authorization: jiraAuth },
      });

      if (response.status === 204) {
        console.log(`  ✓ Deleted ${issueKey}`);
      } else if (response.status === 404) {
        console.log(`  ⚠ ${issueKey} not found (already deleted?)`);
      } else {
        const text = await response.text();
        console.error(`  ✗ Failed to delete ${issueKey} (${response.status}): ${text.slice(0, 200)}`);
      }
    }
  }

  // 3. Clear jira_tickets_gcs_path in BigQuery
  console.log('\nClearing jira_tickets_gcs_path in BigQuery...');
  await bq.query({
    query: `UPDATE ${tableName} SET jira_tickets_gcs_path = NULL WHERE audit_id = @auditId`,
    params: { auditId },
    location: 'US',
  });
  console.log('  ✓ BigQuery updated');

  console.log('\nDone! Re-run the ticket creation pipeline whenever you are ready.');
}

main().catch((err) => {
  console.error('\nError:', err.message ?? err);
  process.exit(1);
});
