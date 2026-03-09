import { ChatAnthropic } from '@langchain/anthropic';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import type { DraftedTicket, HistoricalTicket } from './types';

// ── Constants ────────────────────────────────────────────────────────────────

const REVIEWER_BATCH_SIZE = 10;

const REVIEWER_SYSTEM_PROMPT = `You are a senior SEO engineering lead reviewing Jira tickets before they are published to the team.

For each ticket you receive, write a concise "Risk & Implications" paragraph (3–5 sentences) that covers:

1. POSITIVE OUTCOME — what improves for SEO / crawlability / user experience when fixed correctly.
2. IMPLEMENTATION RISKS — specific to the change type:
   - Frontend Rendering Issue: risk of layout regression, SSR/hydration mismatch, caching of broken output after deployment, A/B test conflicts.
   - API Data Issue - Field Exists: risk of incorrect backoffice edit propagating to all regions simultaneously, potential data consistency gaps.
   - API Data Issue - Field Missing: risk of breaking the existing field mapping if schema change is not backward-compatible, requires coordinated backend + frontend deployment.
   - Out of Scope: risk of misidentifying the root cause; manual investigation needed before any change is made.
3. DEPENDENCIES — does this change need to be done after another fix, require a staging test, or need deployment to all locales?
4. DISCLAIMER — add "⚠ Test on staging before deploying to production" if the change touches shared templates, canonical/hreflang logic, or structured data.

Be specific to the proposed solution — do not write generic boilerplate. Reference the classification and codeLocation when relevant.`;

// ── Zod schema for the reviewer's structured output ──────────────────────────

const reviewBatchSchema = z.object({
  reviews: z.array(
    z.object({
      issueType: z
        .string()
        .describe('The issue_type field from the ticket (copy it exactly)'),
      riskAndImplications: z
        .string()
        .describe('Risk & Implications paragraph (3–5 sentences)'),
    })
  ),
});

// ── Duplicate detection (programmatic, no LLM) ───────────────────────────────

/**
 * Build a lookup of issue_type → most-recent historical ticket.
 * If the same issue_type appeared in multiple past runs, the most recent one wins.
 */
function buildHistoricalIndex(
  historicalTickets: HistoricalTicket[]
): Map<string, HistoricalTicket> {
  const index = new Map<string, HistoricalTicket>();

  // Preserve insertion order — caller should pass tickets sorted newest-first
  for (const h of historicalTickets) {
    if (!index.has(h.issueType)) {
      index.set(h.issueType, h);
    }
  }

  return index;
}

// ── LLM risk review ──────────────────────────────────────────────────────────

async function reviewBatch(
  batch: DraftedTicket[],
  model: ChatAnthropic
): Promise<Map<string, string>> {
  const ticketSummaries = batch
    .map(
      (t, i) => `--- Ticket ${i + 1} ---
issue_type:       ${t.issueGroup.issue_type}
classification:   ${t.classification}
team:             ${t.team}
severity:         ${t.issueGroup.severity}
affected_urls:    ${t.issueGroup.count}
affected_domains: ${(t.issueGroup.affectedDomains ?? []).join(', ')}
objective:        ${t.objective}
proposed_solution:
${t.proposedSolution}
code_location:    ${t.codeLocation}`
    )
    .join('\n\n');

  const structuredLlm = model.withStructuredOutput(reviewBatchSchema);

  const result = await structuredLlm.invoke([
    new SystemMessage(REVIEWER_SYSTEM_PROMPT),
    new HumanMessage(
      `Review the following ${batch.length} SEO ticket(s) and provide a Risk & Implications paragraph for each.\n\n${ticketSummaries}`
    ),
  ]);

  const riskMap = new Map<string, string>();
  for (const review of result.reviews) {
    riskMap.set(review.issueType, review.riskAndImplications);
  }
  return riskMap;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the reviewer agent over all drafted tickets.
 *
 * - Programmatically marks duplicates using historicalTickets.
 * - Calls the LLM (in batches) to write a Risk & Implications paragraph per ticket.
 * - Returns the same tickets enriched with riskAndImplications and optional duplicateOf.
 */
export async function runReviewerAgent(
  tickets: DraftedTicket[],
  historicalTickets: HistoricalTicket[] = []
): Promise<DraftedTicket[]> {
  if (tickets.length === 0) return [];

  const model = new ChatAnthropic({
    model: 'claude-sonnet-4-6',
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxTokens: 4096,
  });

  // ── Step 1: Programmatic duplicate detection ─────────────────────────────
  const historicalIndex = buildHistoricalIndex(historicalTickets);

  // ── Step 2: LLM risk review in batches ───────────────────────────────────
  const riskMap = new Map<string, string>();
  const totalBatches = Math.ceil(tickets.length / REVIEWER_BATCH_SIZE);

  for (let i = 0; i < tickets.length; i += REVIEWER_BATCH_SIZE) {
    const batch = tickets.slice(i, i + REVIEWER_BATCH_SIZE);
    const batchNum = Math.floor(i / REVIEWER_BATCH_SIZE) + 1;

    console.log(
      `[reviewer-agent] Reviewing batch ${batchNum}/${totalBatches} ` +
        `(tickets ${i + 1}–${Math.min(i + REVIEWER_BATCH_SIZE, tickets.length)})`
    );

    try {
      const batchRisks = await reviewBatch(batch, model);
      for (const [issueType, risk] of batchRisks) {
        riskMap.set(issueType, risk);
      }
    } catch (err) {
      console.error(`[reviewer-agent] Batch ${batchNum} LLM call failed:`, err);
      // Fallback: keep an empty risk string so the ticket still publishes
      for (const t of batch) {
        if (!riskMap.has(t.issueGroup.issue_type)) {
          riskMap.set(t.issueGroup.issue_type, '');
        }
      }
    }
  }

  // ── Step 3: Enrich tickets ────────────────────────────────────────────────
  return tickets.map((ticket) => ({
    ...ticket,
    riskAndImplications: riskMap.get(ticket.issueGroup.issue_type) ?? '',
    duplicateOf: historicalIndex.get(ticket.issueGroup.issue_type),
  }));
}
