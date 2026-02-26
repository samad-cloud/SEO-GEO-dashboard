# LangChain SEO Action Plan Agent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `POST /api/seo/audits/[auditId]/action-plan` endpoint that reads the GCS audit JSON, aggregates 50k+ URL issues into a compact digest, runs a LangChain tool-calling agent (claude-sonnet-4-6) to generate an `ACTION-PLAN.md`, stores it in GCS, and writes the path back to BigQuery.

**Architecture:** A pure TypeScript pre-processor aggregates the `urls[*].issues` by `issue_type + severity` into ~5–10 KB before any LLM call. A `createReactAgent` (LangGraph) with 4 in-memory tools lets the LLM probe the digest at will. The final markdown is uploaded to GCS and the `action_plan_gcs_path` column (nullable STRING, added manually in BigQuery console) is updated via DML UPDATE.

**Tech Stack:** Next.js 16 App Router, `@langchain/core`, `@langchain/anthropic`, `@langchain/langgraph`, `zod`, `@google-cloud/storage` (already installed), `@google-cloud/bigquery` (already installed).

---

## Pre-requisites (do these before writing any code)

### Step 0a — Add BigQuery column

Run once in the BigQuery console:

```sql
ALTER TABLE `printerpix-general.GA_CG.seo_audit_results`
ADD COLUMN action_plan_gcs_path STRING;
```

Verify: query the table and confirm the column exists with all nulls.

### Step 0b — Set environment variable

Add to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install LangChain packages**

```bash
npm install @langchain/core @langchain/anthropic @langchain/langgraph zod
```

**Step 2: Verify install**

```bash
node -e "require('@langchain/anthropic'); console.log('ok')"
```

Expected: `ok`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install langchain and zod for seo action plan agent"
```

---

## Task 2: Add types

**Files:**
- Create: `src/lib/agents/seo-action-plan/types.ts`
- Modify: `src/types/bigquery.ts`

**Step 1: Create `src/lib/agents/seo-action-plan/types.ts`**

```typescript
export interface IssueGroup {
  issue_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  count: number;
  sample_urls: string[];
}

export interface CategoryScore {
  score: number;
  issue_count: number;
  status: string;
}

export interface PageSpeedSummary {
  urls_analyzed: number;
  mobile_results?: {
    avg_lcp_ms?: number;
    avg_cls?: number;
    avg_inp_ms?: number;
    poor_lcp_count?: number;
    poor_cls_count?: number;
    poor_inp_count?: number;
  };
  desktop_results?: {
    avg_lcp_ms?: number;
    avg_cls?: number;
    avg_inp_ms?: number;
    poor_lcp_count?: number;
    poor_cls_count?: number;
    poor_inp_count?: number;
  };
}

export interface PriorityIssue {
  issue_type: string;
  url: string;
  severity: string;
  category: string;
  description: string;
  recommendation: string;
}

export interface IssueSummary {
  total_issues: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

export interface IssueDigest {
  domain: string;
  audit_date: string;
  health_score: number;
  issue_summary: IssueSummary;
  category_scores: Record<string, CategoryScore>;
  issue_groups: IssueGroup[];
  priority_issues: PriorityIssue[];
  pagespeed_summary: PageSpeedSummary;
}
```

**Step 2: Add `action_plan_gcs_path` to `src/types/bigquery.ts`**

In `BigQuerySeoAuditRow`, add the new field after `report_gcs_path`:

```typescript
action_plan_gcs_path?: string | null;
```

The interface should now read:
```typescript
export interface BigQuerySeoAuditRow {
  audit_id: string;
  domain: string;
  audit_date: { value: string } | string;
  health_score: number | null;
  total_issues: number | null;
  critical_count: number | null;
  high_count: number | null;
  medium_count: number | null;
  low_count: number | null;
  report_gcs_path: string | null;
  action_plan_gcs_path?: string | null;
}
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/lib/agents/seo-action-plan/types.ts src/types/bigquery.ts
git commit -m "feat: add IssueDigest types and action_plan_gcs_path to BigQuery row type"
```

---

## Task 3: Build the pre-processor

This is the most important piece — it converts 55 MB of raw JSON into a ~5–10 KB digest with zero LLM calls.

**Files:**
- Create: `src/lib/agents/seo-action-plan/preprocessor.ts`

**Step 1: Create `src/lib/agents/seo-action-plan/preprocessor.ts`**

```typescript
import type { IssueDigest, IssueGroup, PriorityIssue, IssueSummary, CategoryScore, PageSpeedSummary } from './types';

interface RawUrlIssue {
  issue_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description?: string;
  recommendation?: string;
  current_value?: string;
  expected_value?: string;
  status?: string;
}

interface RawUrlEntry {
  issues?: RawUrlIssue[];
  crawl?: Record<string, unknown>;
  pagespeed?: Record<string, unknown>;
  gsc?: Record<string, unknown>;
  security?: Record<string, unknown>;
}

// Shape of the raw GCS JSON — only the fields we need
interface RawAuditJson {
  domain: string;
  audit_date: string;
  health_score: number;
  issue_summary: {
    total_issues: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
  };
  category_scores: Record<string, {
    score: number;
    issue_count: number;
    status: string;
  }>;
  priority_issues?: PriorityIssue[];
  pagespeed_summary?: PageSpeedSummary;
  urls?: Record<string, RawUrlEntry>;
}

const SAMPLE_LIMIT = 3; // max sample URLs per issue group

/**
 * Aggregate raw audit JSON into a compact IssueDigest.
 * Processes the entire urls map without loading it all into a single variable —
 * iterates key-by-key to keep memory usage predictable.
 */
export function buildIssueDigest(raw: RawAuditJson): IssueDigest {
  // Map: `${issue_type}|||${severity}|||${category}` → { count, sample_urls }
  const groupMap = new Map<string, { count: number; severity: string; category: string; sample_urls: string[] }>();

  const urls = raw.urls ?? {};

  for (const [url, entry] of Object.entries(urls)) {
    if (!entry.issues) continue;

    for (const issue of entry.issues) {
      const key = `${issue.issue_type}|||${issue.severity}|||${issue.category}`;
      const existing = groupMap.get(key);

      if (existing) {
        existing.count++;
        if (existing.sample_urls.length < SAMPLE_LIMIT) {
          existing.sample_urls.push(url);
        }
      } else {
        groupMap.set(key, {
          count: 1,
          severity: issue.severity,
          category: issue.category,
          sample_urls: [url],
        });
      }
    }
  }

  // Convert map to sorted IssueGroup array (high count first)
  const issue_groups: IssueGroup[] = Array.from(groupMap.entries())
    .map(([key, val]) => {
      const [issue_type] = key.split('|||');
      return {
        issue_type,
        severity: val.severity as IssueGroup['severity'],
        category: val.category,
        count: val.count,
        sample_urls: val.sample_urls,
      };
    })
    .sort((a, b) => b.count - a.count);

  const issue_summary: IssueSummary = {
    total_issues: raw.issue_summary.total_issues,
    critical_count: raw.issue_summary.critical_count,
    high_count: raw.issue_summary.high_count,
    medium_count: raw.issue_summary.medium_count,
    low_count: raw.issue_summary.low_count,
  };

  const category_scores: Record<string, CategoryScore> = {};
  for (const [cat, val] of Object.entries(raw.category_scores)) {
    category_scores[cat] = {
      score: val.score,
      issue_count: val.issue_count,
      status: val.status,
    };
  }

  return {
    domain: raw.domain,
    audit_date: raw.audit_date,
    health_score: raw.health_score,
    issue_summary,
    category_scores,
    issue_groups,
    priority_issues: raw.priority_issues ?? [],
    pagespeed_summary: raw.pagespeed_summary ?? { urls_analyzed: 0 },
  };
}
```

**Step 2: Sanity-check the pre-processor manually**

Create a temporary script `scripts/test-preprocessor.mjs`:

```javascript
import { readFileSync } from 'fs';

// Inline the buildIssueDigest logic (copy-paste from preprocessor.ts, strip types)
// Then run against the real audit file:
const raw = JSON.parse(readFileSync(
  'C:/Users/Admin3k/Documents/SEO/agents/audit/printerpix.com_20260216_224451.json',
  'utf-8'
));

let groupMap = new Map();
const SAMPLE_LIMIT = 3;
for (const [url, entry] of Object.entries(raw.urls ?? {})) {
  for (const issue of (entry.issues ?? [])) {
    const key = `${issue.issue_type}|||${issue.severity}|||${issue.category}`;
    const ex = groupMap.get(key);
    if (ex) {
      ex.count++;
      if (ex.sample_urls.length < SAMPLE_LIMIT) ex.sample_urls.push(url);
    } else {
      groupMap.set(key, { count: 1, severity: issue.severity, category: issue.category, sample_urls: [url] });
    }
  }
}

const groups = Array.from(groupMap.entries())
  .map(([key, val]) => ({ issue_type: key.split('|||')[0], ...val }))
  .sort((a, b) => b.count - a.count);

console.log(`Total unique issue types: ${groups.length}`);
console.log(`Top 10 issues:`);
groups.slice(0, 10).forEach(g => console.log(`  ${g.count}x [${g.severity}] ${g.issue_type} (${g.category})`));

const digestJson = JSON.stringify({
  domain: raw.domain,
  health_score: raw.health_score,
  issue_summary: raw.issue_summary,
  category_scores: raw.category_scores,
  issue_groups: groups,
  priority_issues: raw.priority_issues,
  pagespeed_summary: raw.pagespeed_summary,
});
console.log(`\nDigest size: ${(digestJson.length / 1024).toFixed(1)} KB`);
```

Run it:
```bash
node scripts/test-preprocessor.mjs
```

Expected output:
```
Total unique issue types: ~20-50
Top 10 issues:
  2100x [high] Missing HSTS (security)
  1566x [high] Not Indexed (indexation)
  ...
Digest size: ~X KB  (should be well under 50 KB)
```

**Step 3: Delete the test script**

```bash
rm scripts/test-preprocessor.mjs
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/lib/agents/seo-action-plan/preprocessor.ts
git commit -m "feat: add SEO audit issue digest pre-processor"
```

---

## Task 4: Build the LangChain tools

Four tools that let the agent query the in-memory `IssueDigest`. No LLM calls here — these are pure functions wrapped in LangChain's `DynamicStructuredTool`.

**Files:**
- Create: `src/lib/agents/seo-action-plan/tools.ts`

**Step 1: Create `src/lib/agents/seo-action-plan/tools.ts`**

```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { IssueDigest, IssueGroup } from './types';

/**
 * Build the 4 LangChain tools that query an IssueDigest in-memory.
 * Called once per agent run — the digest is closed over.
 */
export function buildAuditTools(digest: IssueDigest): DynamicStructuredTool[] {
  return [
    new DynamicStructuredTool({
      name: 'getIssuesByCategory',
      description:
        'Returns all aggregated issue groups for a specific SEO category. ' +
        'Valid categories: crawlability, content, performance, security, indexation, on_page, images, mobile, international.',
      schema: z.object({
        category: z.string().describe('The issue category to filter by'),
      }),
      func: async ({ category }) => {
        const groups: IssueGroup[] = digest.issue_groups.filter(
          (g) => g.category.toLowerCase() === category.toLowerCase()
        );
        if (groups.length === 0) {
          return `No issues found for category "${category}". Available categories: ${[...new Set(digest.issue_groups.map((g) => g.category))].join(', ')}`;
        }
        return JSON.stringify(groups, null, 2);
      },
    }),

    new DynamicStructuredTool({
      name: 'getTopIssues',
      description:
        'Returns the top N most-prevalent issues filtered by severity. ' +
        'Use this to identify the biggest problems at each priority level.',
      schema: z.object({
        severity: z
          .enum(['critical', 'high', 'medium', 'low', 'all'])
          .describe('Severity level to filter by, or "all" for no filter'),
        limit: z.number().int().min(1).max(50).default(10).describe('Max number of issues to return'),
      }),
      func: async ({ severity, limit }) => {
        let groups = digest.issue_groups;
        if (severity !== 'all') {
          groups = groups.filter((g) => g.severity === severity);
        }
        return JSON.stringify(groups.slice(0, limit), null, 2);
      },
    }),

    new DynamicStructuredTool({
      name: 'getCategoryScore',
      description:
        'Returns the health score, issue count, and status for a specific SEO category. ' +
        'Valid categories: crawlability, content, performance, security, mobile, international.',
      schema: z.object({
        category: z.string().describe('The category name'),
      }),
      func: async ({ category }) => {
        const score = digest.category_scores[category.toLowerCase()];
        if (!score) {
          return `No score found for "${category}". Available: ${Object.keys(digest.category_scores).join(', ')}`;
        }
        return JSON.stringify({ category, ...score }, null, 2);
      },
    }),

    new DynamicStructuredTool({
      name: 'getPageSpeedSummary',
      description:
        'Returns Core Web Vitals summary data (LCP, CLS, INP) aggregated across all audited URLs. ' +
        'Use this to write the Performance section of the action plan.',
      schema: z.object({}),
      func: async () => {
        return JSON.stringify(digest.pagespeed_summary, null, 2);
      },
    }),
  ];
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/lib/agents/seo-action-plan/tools.ts
git commit -m "feat: add LangChain tools for SEO issue digest querying"
```

---

## Task 5: Build the agent

**Files:**
- Create: `src/lib/agents/seo-action-plan/agent.ts`

**Step 1: Create `src/lib/agents/seo-action-plan/agent.ts`**

```typescript
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { buildAuditTools } from './tools';
import type { IssueDigest } from './types';

const SYSTEM_PROMPT = `You are a senior SEO strategist. You have been given access to tools that query aggregated SEO audit data for a website. Your task is to produce a comprehensive, prioritised ACTION-PLAN.md in markdown format.

Use the tools to investigate each SEO category before writing its section. Do not guess — always call a tool to get the data before making recommendations.

The action plan MUST follow this exact structure:

# SEO Action Plan — {domain}
**Audit Date:** {audit_date}
**Health Score:** {health_score}/100

---

## Executive Summary
- Overall assessment (1-2 sentences)
- Top 5 critical/high issues as a bullet list
- Top 5 quick wins as a bullet list

## Technical SEO
### Crawlability & Indexation
[findings and recommendations]

### Security Headers
[findings and recommendations]

## Content
[findings and recommendations from content category issues]

## On-Page SEO
[findings and recommendations from on_page category issues]

## Performance (Core Web Vitals)
[LCP, CLS, INP findings and recommendations]

## Images
[findings and recommendations from images category issues]

---

## Priority Summary

| Priority | Issue | Affected URLs | Action |
|---|---|---|---|
[table rows: Critical → High → Medium → Low]

---

Priority definitions:
- **Critical**: Blocks indexing or causes penalties — fix immediately
- **High**: Significantly impacts rankings — fix within 1 week
- **Medium**: Optimisation opportunity — fix within 1 month
- **Low**: Nice to have — backlog

For each finding, state: what the issue is, how many URLs are affected, 2-3 sample URLs, and a concrete recommended action.
Only include sections where you find actual issues. Do not fabricate data.`;

export async function runActionPlanAgent(digest: IssueDigest): Promise<string> {
  const model = new ChatAnthropic({
    model: 'claude-sonnet-4-6',
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxTokens: 8192,
  });

  const tools = buildAuditTools(digest);

  const agent = createReactAgent({
    llm: model,
    tools,
  });

  const userMessage = `
Generate a complete ACTION-PLAN.md for the following audit:

Domain: ${digest.domain}
Audit Date: ${digest.audit_date}
Health Score: ${digest.health_score}/100

Issue Summary:
- Total: ${digest.issue_summary.total_issues}
- Critical: ${digest.issue_summary.critical_count}
- High: ${digest.issue_summary.high_count}
- Medium: ${digest.issue_summary.medium_count}
- Low: ${digest.issue_summary.low_count}

Available issue categories: ${Object.keys(digest.category_scores).join(', ')}

Use your tools to investigate each category and write the full action plan now.
`;

  const result = await agent.invoke({
    messages: [new HumanMessage(userMessage)],
  }, {
    configurable: {
      system: SYSTEM_PROMPT,
    },
  });

  // Extract the final text message from the agent's response
  const messages = result.messages;
  const lastMessage = messages[messages.length - 1];

  if (typeof lastMessage.content === 'string') {
    return lastMessage.content;
  }

  if (Array.isArray(lastMessage.content)) {
    return lastMessage.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }

  throw new Error('Agent returned unexpected message format');
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/lib/agents/seo-action-plan/agent.ts
git commit -m "feat: add LangChain ReAct agent for SEO action plan generation"
```

---

## Task 6: Build the API route

**Files:**
- Create: `src/app/api/seo/audits/[auditId]/action-plan/route.ts`

**Step 1: Create `src/app/api/seo/audits/[auditId]/action-plan/route.ts`**

```typescript
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

  try {
    // 3. Stream + parse the raw GCS JSON
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

    // 6. Upload ACTION-PLAN.md to GCS
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
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/api/seo/audits/[auditId]/action-plan/route.ts
git commit -m "feat: add POST action-plan API route for SEO audit"
```

---

## Task 7: End-to-end test

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Find a real auditId from BigQuery**

Run in BigQuery console:
```sql
SELECT audit_id, domain, audit_date, report_gcs_path
FROM `printerpix-general.GA_CG.seo_audit_results`
WHERE report_gcs_path IS NOT NULL
ORDER BY audit_date DESC
LIMIT 1
```

Copy the `audit_id`.

**Step 3: Call the endpoint**

```bash
curl -X POST http://localhost:3000/api/seo/audits/{AUDIT_ID_HERE}/action-plan \
  -H "Content-Type: application/json"
```

Expected response (may take 60-120 seconds):
```json
{
  "status": "complete",
  "actionPlanGcsPath": "gs://your-bucket/action-plans/domain.com/2026-02-16/ACTION-PLAN.md",
  "auditId": "..."
}
```

**Step 4: Verify idempotency (second call returns "exists")**

Call the same endpoint again immediately:
```bash
curl -X POST http://localhost:3000/api/seo/audits/{AUDIT_ID_HERE}/action-plan
```

Expected:
```json
{ "status": "exists", "actionPlanGcsPath": "gs://...", "auditId": "..." }
```

**Step 5: Download and inspect the action plan**

```bash
gcloud storage cp gs://YOUR_BUCKET/action-plans/domain.com/2026-02-16/ACTION-PLAN.md - | head -80
```

Verify it contains: Executive Summary, Technical SEO section, Priority Summary table, real issue counts.

**Step 6: Verify BigQuery was updated**

```sql
SELECT audit_id, domain, action_plan_gcs_path
FROM `printerpix-general.GA_CG.seo_audit_results`
WHERE action_plan_gcs_path IS NOT NULL
LIMIT 5
```

**Step 7: Commit (if any fixups were needed)**

```bash
git add -p
git commit -m "fix: adjust action plan agent after e2e testing"
```

---

## Task 8: Add a download route for the action plan (optional quality-of-life)

**Files:**
- Create: `src/app/api/seo/audits/[auditId]/action-plan/download/route.ts`

If you want the dashboard to be able to display or download the generated plan, add a GET route that mirrors the existing download pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getBigQueryClient, getTableName } from '@/lib/bigquery';
import { getStorageClient, parseGcsUri } from '@/lib/gcs';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ auditId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { auditId } = await params;

  if (!auditId) {
    return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
  }

  const bq = getBigQueryClient();
  const tableName = getTableName();

  const [rows] = await bq.query({
    query: `SELECT action_plan_gcs_path FROM \`${tableName}\` WHERE audit_id = @auditId LIMIT 1`,
    params: { auditId },
    location: 'US',
  });

  if (!rows.length || !rows[0].action_plan_gcs_path) {
    return NextResponse.json({ error: 'Action plan not found — generate it first via POST' }, { status: 404 });
  }

  const gcsUri = rows[0].action_plan_gcs_path as string;
  const parsed = parseGcsUri(gcsUri);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid GCS path' }, { status: 500 });
  }

  const storage = getStorageClient();
  const [contents] = await storage.bucket(parsed.bucket).file(parsed.path).download();

  return new Response(contents.toString('utf-8'), {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="ACTION-PLAN-${auditId}.md"`,
    },
  });
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/api/seo/audits/[auditId]/action-plan/download/route.ts
git commit -m "feat: add GET download route for generated SEO action plan"
```

---

## What was NOT implemented (intentionally)

- **No streaming** — the agent run is synchronous. For long runs, consider wrapping in a background job pattern (similar to `geo/research/run`) in a future iteration.
- **No schema analysis section** — the audit JSON has no schema/structured data data.
- **No E-E-A-T section** — no content quality signals in the URL issue data.
- **No auth guard** — add middleware authentication consistent with the rest of the app if needed.
