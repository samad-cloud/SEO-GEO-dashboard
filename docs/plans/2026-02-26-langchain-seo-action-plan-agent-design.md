# Design: LangChain SEO Action Plan Agent

**Date**: 2026-02-26
**Status**: Approved

## Problem

The Cloud Run audit job produces a large JSON report (55+ MB, 3,224+ URLs) stored in GCS.
The `urls` section contains per-URL issue arrays totalling 51,000+ issues — far too large to
pass directly to an LLM. We need a cost-efficient agent that reads this data and produces a
prioritised `ACTION-PLAN.md` matching the format of the `seo-audit` skill output.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Agent runtime | TypeScript / Node.js (Next.js API route) | Consistent with existing api routes; no new Python service |
| LLM | `claude-sonnet-4-6` via `@langchain/anthropic` | Strong at structured document generation |
| Agent pattern | LangChain `createReactAgent` with tool calling | True agent behaviour; Claude decides depth of analysis |
| Context strategy | Pre-process URLs into compact IssueDigest (~5–10 KB) | Avoid LLM context overload; aggregate 51k issues by type |
| Action plan storage | GCS (markdown file) + BigQuery nullable column | Consistent with `report_gcs_path` pattern |
| BigQuery write | DML `UPDATE` on `action_plan_gcs_path` column | Single nullable column added to existing table |

## BigQuery Schema Change (manual, one-time)

```sql
ALTER TABLE `printerpix-general.GA_CG.seo_audit_results`
ADD COLUMN action_plan_gcs_path STRING;
```

## Architecture

```
POST /api/seo/audits/[auditId]/action-plan
         │
         ▼
  1. Fetch report_gcs_path from BigQuery (audit_id)
         │
         ▼
  2. Stream + parse JSON from GCS
         │
         ▼
  3. Pre-processor (pure TS, no LLM)
     - Aggregate urls[*].issues → IssueGroup[]
       { issue_type, severity, category, count, sample_urls[3] }
     - Extract: category_scores, issue_summary, priority_issues,
                pagespeed_summary, domain, audit_date, health_score
     → IssueDigest (~5–10 KB)
         │
         ▼
  4. LangChain ReAct Agent (claude-sonnet-4-6)
     Tools (query IssueDigest in-memory):
     - getIssuesByCategory(category)  → IssueGroup[] for that category
     - getTopIssues(severity, limit)  → IssueGroup[] sorted by count desc
     - getCategoryScore(category)     → { score, issue_count, status }
     - getPageSpeedSummary()          → { lcp, cls, inp, urls_analyzed }
     Agent reasons over tools and writes ACTION-PLAN.md content
         │
         ▼
  5. Upload ACTION-PLAN.md to GCS
     gs://{bucket}/action-plans/{domain}/{audit_date}/ACTION-PLAN.md
         │
         ▼
  6. UPDATE BigQuery: SET action_plan_gcs_path = @path WHERE audit_id = @auditId
         │
         ▼
  7. Return { actionPlanGcsPath, status: "complete" }
```

## New Files

```
src/
  app/api/seo/audits/[auditId]/
    action-plan/
      route.ts                  ← POST endpoint (orchestrates steps 1–7)
  lib/agents/seo-action-plan/
    preprocessor.ts             ← aggregates urls issues → IssueDigest
    tools.ts                    ← 4 LangChain DynamicStructuredTool definitions
    agent.ts                    ← createReactAgent + system prompt
    types.ts                    ← IssueDigest, IssueGroup, CategoryScore types
```

## Modified Files

```
src/types/bigquery.ts           ← add action_plan_gcs_path?: string | null
```

## New Dependencies

```
@langchain/core
@langchain/anthropic
@langchain/langgraph          ← for createReactAgent
zod                            ← tool input schemas (likely already installed)
```

## IssueDigest Shape

```typescript
interface IssueGroup {
  issue_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  count: number;
  sample_urls: string[];
}

interface IssueDigest {
  domain: string;
  audit_date: string;
  health_score: number;
  issue_summary: { total: number; critical: number; high: number; medium: number; low: number };
  category_scores: Record<string, { score: number; issue_count: number; status: string }>;
  issue_groups: IssueGroup[];          // aggregated from urls[*].issues
  priority_issues: PriorityIssue[];    // top 10 pre-identified issues
  pagespeed_summary: PageSpeedSummary;
}
```

## ACTION-PLAN.md Output Sections

Only sections grounded in actual audit data (no speculation):

| Section | Data source |
|---|---|
| Executive Summary (Health Score, Top 5 issues, quick wins) | `issue_summary` + `category_scores` + `priority_issues` |
| Technical SEO (crawlability, indexability, security headers) | `issue_groups` where `category ∈ {crawlability, indexation, security}` |
| Content (titles, meta descriptions, thin content) | `issue_groups` where `category = content` |
| On-Page SEO (headings, internal links) | `issue_groups` where `category = on_page` |
| Performance (LCP, CLS, INP) | `pagespeed_summary` |
| Images (missing alt text, oversized) | `issue_groups` where `category = images` |

Priority levels follow seo-audit skill definitions:
- **Critical**: Blocks indexing or causes penalties
- **High**: Significantly impacts rankings (fix within 1 week)
- **Medium**: Optimisation opportunity (fix within 1 month)
- **Low**: Nice to have (backlog)

## API Contract

**Request**
```
POST /api/seo/audits/[auditId]/action-plan
```
No request body required — `auditId` is sufficient to look up everything from BigQuery + GCS.

**Response (success)**
```json
{
  "status": "complete",
  "actionPlanGcsPath": "gs://bucket/action-plans/printerpix.com/2026-02-16/ACTION-PLAN.md",
  "auditId": "..."
}
```

**Response (already exists)**
```json
{
  "status": "exists",
  "actionPlanGcsPath": "gs://...",
  "auditId": "..."
}
```

**Error responses**: 400 (missing auditId), 404 (audit not found), 500 (generation failed)

## Environment Variables Required

```
ANTHROPIC_API_KEY=sk-ant-...          ← new, for LangChain Anthropic provider
GCS_ACTION_PLANS_BUCKET=...           ← GCS bucket for action plan output (can reuse existing)
```

## Estimated LLM Cost Per Run

- Pre-processing: 0 LLM calls
- Agent tool calls: ~4–8 calls × ~1K tokens each ≈ ~8K input tokens
- Final synthesis: ~3–5K output tokens
- **Total per run: ~$0.10–0.20 at claude-sonnet-4-6 pricing**
