import { getStorageClient } from '@/lib/gcs';
import { groupIssuesForTickets } from './grouper';
import { runClassifierAgent } from './classifier-agent';
import { publishTicketsToJira } from './jira-publisher';
import type {
  RawAuditJson,
  DraftedTicket,
  TicketCreationResult,
} from './types';

const CLASSIFIER_BATCH_SIZE = 3; // max concurrent classifier agents

/**
 * Run the full 3-stage ticket-creation pipeline.
 *
 * @param auditId   - The audit ID (used for idempotency record)
 * @param rawJson   - The full raw audit JSON downloaded from GCS
 * @param domain    - e.g. "printerpix.com"
 * @param auditDate - e.g. "2026-02-16"
 * @param bucket    - GCS bucket name (parsed from report_gcs_path)
 */
export async function runTicketCreationPipeline(
  auditId: string,
  rawJson: RawAuditJson,
  domain: string,
  auditDate: string,
  bucket: string
): Promise<TicketCreationResult> {
  // ── Stage 1: Issue Grouper ───────────────────────────────────────────────
  const issueGroups = groupIssuesForTickets(rawJson);
  console.log(
    `[ticket-pipeline] Grouped ${issueGroups.length} issue types from audit ${auditId}`
  );

  // ── Stage 2: Classifier + Drafter (batched parallel) ────────────────────
  const draftedTickets: DraftedTicket[] = [];
  const classifierFailures: Array<{ issueType: string; error: string }> = [];

  for (let i = 0; i < issueGroups.length; i += CLASSIFIER_BATCH_SIZE) {
    const batch = issueGroups.slice(i, i + CLASSIFIER_BATCH_SIZE);
    const batchNum = Math.floor(i / CLASSIFIER_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(issueGroups.length / CLASSIFIER_BATCH_SIZE);

    console.log(
      `[ticket-pipeline] Classifying batch ${batchNum}/${totalBatches} ` +
        `(issues ${i + 1}–${Math.min(i + CLASSIFIER_BATCH_SIZE, issueGroups.length)})`
    );

    const results = await Promise.allSettled(
      batch.map((group) => runClassifierAgent(group))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        draftedTickets.push(result.value);
      } else {
        const issueType = batch[j].issue_type;
        const errorMsg =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        console.error(
          `[ticket-pipeline] Classifier failed for "${issueType}": ${errorMsg}`
        );
        classifierFailures.push({ issueType, error: errorMsg });
      }
    }
  }

  console.log(
    `[ticket-pipeline] Drafted ${draftedTickets.length} tickets. ` +
      `${classifierFailures.length} classifier failures.`
  );

  // ── Stage 3: Jira Publisher (sequential) ────────────────────────────────
  const publishResults = await publishTicketsToJira(draftedTickets);

  const successfulTickets = publishResults
    .filter((r) => r.success && r.ticket)
    .map((r) => r.ticket!);

  const publishFailures = publishResults
    .filter((r) => !r.success)
    .map((r, idx) => ({
      issueType: draftedTickets[idx]?.issueGroup.issue_type ?? 'unknown',
      error: r.error ?? 'Unknown publish error',
    }));

  const allFailures = [...classifierFailures, ...publishFailures];

  console.log(
    `[ticket-pipeline] Created ${successfulTickets.length} Jira tickets. ` +
      `${publishFailures.length} publish failures.`
  );

  // ── Store results in GCS ────────────────────────────────────────────────
  const gcsObjectPath = `tickets/${domain}/${auditDate}/tickets.json`;
  const storage = getStorageClient();

  const ticketsJson = JSON.stringify(
    {
      auditId,
      domain,
      auditDate,
      createdAt: new Date().toISOString(),
      ticketsCreated: successfulTickets.length,
      tickets: successfulTickets,
      failures: allFailures,
    },
    null,
    2
  );

  await storage.bucket(bucket).file(gcsObjectPath).save(ticketsJson, {
    contentType: 'application/json; charset=utf-8',
  });

  const gcsPath = `gs://${bucket}/${gcsObjectPath}`;
  console.log(`[ticket-pipeline] Results stored at ${gcsPath}`);

  return {
    status: 'complete',
    auditId,
    ticketsCreated: successfulTickets.length,
    tickets: successfulTickets,
    failures: allFailures,
    gcsPath,
  };
}
