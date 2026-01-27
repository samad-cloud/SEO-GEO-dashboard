import { Storage } from '@google-cloud/storage';

// Singleton GCS client instance
let storageClient: Storage | null = null;

/**
 * Get or create GCS client singleton
 * Uses same credentials as BigQuery
 */
export function getStorageClient(): Storage {
  if (storageClient) {
    return storageClient;
  }

  const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;

  if (credentialsBase64) {
    const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credentialsJson);

    storageClient = new Storage({
      projectId: credentials.project_id,
      credentials,
    });
  } else {
    // Fallback to default credentials
    storageClient = new Storage();
  }

  return storageClient;
}

/**
 * Parse a gs:// URI into bucket and path
 */
export function parseGcsUri(gcsUri: string): { bucket: string; path: string } | null {
  const match = gcsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { bucket: match[1], path: match[2] };
}

/**
 * Fetch and parse JSON file from GCS
 */
export async function fetchJsonFromGcs<T>(gcsUri: string): Promise<T> {
  const parsed = parseGcsUri(gcsUri);
  if (!parsed) {
    throw new Error(`Invalid GCS URI: ${gcsUri}`);
  }

  const storage = getStorageClient();
  const bucket = storage.bucket(parsed.bucket);
  const file = bucket.file(parsed.path);

  const [contents] = await file.download();
  return JSON.parse(contents.toString('utf-8')) as T;
}
