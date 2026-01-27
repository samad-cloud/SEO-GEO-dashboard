import { BigQuery } from '@google-cloud/bigquery';

// BigQuery configuration constants
export const BIGQUERY_PROJECT_ID = process.env.BIGQUERY_PROJECT_ID || 'printerpix-general';
export const BIGQUERY_DATASET = process.env.BIGQUERY_DATASET || 'GA_CG';
export const BIGQUERY_TABLE = process.env.BIGQUERY_TABLE || 'seo_audit_results';

// Singleton BigQuery client instance
let bigQueryClient: BigQuery | null = null;

/**
 * Get or create BigQuery client singleton
 * Handles base64-encoded credentials from environment variable
 */
export function getBigQueryClient(): BigQuery {
  if (bigQueryClient) {
    return bigQueryClient;
  }

  const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;

  if (credentialsBase64) {
    // Decode base64 credentials
    const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credentialsJson);

    bigQueryClient = new BigQuery({
      projectId: credentials.project_id || BIGQUERY_PROJECT_ID,
      credentials,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Use ADC file path
    bigQueryClient = new BigQuery({
      projectId: BIGQUERY_PROJECT_ID,
    });
  } else {
    // Fallback: attempt default credentials (for local dev with gcloud auth)
    bigQueryClient = new BigQuery({
      projectId: BIGQUERY_PROJECT_ID,
    });
  }

  return bigQueryClient;
}

/**
 * Get fully qualified table name
 */
export function getTableName(): string {
  return `${BIGQUERY_PROJECT_ID}.${BIGQUERY_DATASET}.${BIGQUERY_TABLE}`;
}
