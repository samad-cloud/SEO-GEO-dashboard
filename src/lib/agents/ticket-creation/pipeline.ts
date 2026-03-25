import { getStorageClient } from '@/lib/gcs';
import { runClassifierAgent } from './classifier-agent';
import { runReviewerAgent } from './reviewer-agent';
import { saveTicketsToSupabase } from '@/lib/supabase/tickets';
import type {
  IssueGroupForTicket,
  DraftedTicket,
  HistoricalTicket,
  TicketCreationResult,
} from './types';

const CLASSIFIER_BATCH_SIZE = 6;

interface PipelineContext {
  auditId?: string;
  domain?: string;
  auditDate?: string;
}

/**
 * Run the ticket-creation pipeline (Stages 1 + 2 only).
 * Stage 3 (Jira publish) is now a manual action via the "Publish to Jira" button.
 */
export async function runTicketCreationPipeline(
  runId: string,
  issueGroups: IssueGroupForTicket[],
  bucket: string,
  historicalTickets: HistoricalTicket[] = [],
  context: PipelineContext = {}
): Promise<TicketCreationResult> {
  console.log(
    `[ticket-pipeline] Starting pipeline for run "${runId}" with ${issueGroups.length} issue groups`
  );

  // ── Stage 1: Classifier + Drafter (batched parallel) ────────────────────
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
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.error(`[ticket-pipeline] Classifier failed for "${issueType}": ${errorMsg}`);
        classifierFailures.push({ issueType, error: errorMsg });
      }
    }
  }

  console.log(
    `[ticket-pipeline] Drafted ${draftedTickets.length} tickets. ` +
      `${classifierFailures.length} classifier failures.`
  );

  // ── Stage 2: Reviewer Agent (risk assessment + deduplication) ────────────
  console.log(
    `[ticket-pipeline] Running reviewer agent (${historicalTickets.length} historical tickets)`
  );
  const reviewedTickets = await runReviewerAgent(draftedTickets, historicalTickets);
  const duplicateCount = reviewedTickets.filter((t) => t.duplicateOf).length;
  if (duplicateCount > 0) {
    console.log(`[ticket-pipeline] ${duplicateCount} duplicate(s) detected.`);
  }

  // ── Stage 3: Save to Supabase (replaces auto-publish to Jira) ────────────
  const domain =
    context.domain ??
    (issueGroups[0]?.affectedDomains[0] ?? 'unknown');
  const auditDate = context.auditDate ?? null;
  const auditId = context.auditId ?? null;

  let savedTicketIds: string[] = [];
  try {
    const saved = await saveTicketsToSupabase(
      reviewedTickets,
      runId,
      auditId,
      domain,
      auditDate
    );
    savedTicketIds = saved.map((r) => r.id);
    console.log(`[ticket-pipeline] Saved ${saved.length} tickets to Supabase.`);
  } catch (err) {
    console.error('[ticket-pipeline] Failed to save to Supabase:', err);
    // Non-fatal: still store in GCS and return failures
    classifierFailures.push({
      issueType: '__supabase_save__',
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ── GCS: store a summary for backward-compat / audit trail ────────────────
  const gcsObjectPath = `tickets/combined/${runId}/tickets.json`;
  const storage = getStorageClient();

  const ticketsJson = JSON.stringify(
    {
      runId,
      createdAt: new Date().toISOString(),
      ticketsDrafted: reviewedTickets.length,
      supabaseIds: savedTicketIds,
      failures: classifierFailures,
    },
    null,
    2
  );

  await storage.bucket(bucket).file(gcsObjectPath).save(ticketsJson, {
    contentType: 'application/json; charset=utf-8',
  });

  const gcsPath = `gs://${bucket}/${gcsObjectPath}`;
  console.log(`[ticket-pipeline] Summary stored at ${gcsPath}`);

  return {
    status: 'complete',
    runId,
    ticketsCreated: reviewedTickets.length,
    tickets: [],          // Jira results — empty until manually published
    failures: classifierFailures,
    gcsPath,
  };
}
