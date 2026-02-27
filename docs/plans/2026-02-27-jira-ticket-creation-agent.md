# Jira Ticket Creation Agent — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `POST /api/seo/audits/[auditId]/tickets` endpoint that downloads the raw audit JSON from GCS, groups issues by type, runs a LangChain ReAct classifier agent per issue group (3 in parallel) to classify root cause and draft a structured Jira ticket, then pushes all tickets to the ENG board on `printerpix.atlassian.net` — attaching a CSV of affected URLs when count exceeds 5.

**Architecture:** A pure TypeScript pre-processor groups the `urls[*].issues` by `issue_type + severity + category` into `IssueGroupForTicket[]`. A `createReactAgent` (LangGraph) with 5 spec-reading and API-calling tools classifies each group and drafts a structured ticket following the rules in `middle-agent-ticket-drafting-plan.md`. A sequential Jira publisher converts each ticket to Atlassian Document Format and creates it via REST API.

**Tech Stack:** Next.js 16 App Router, `@langchain/core`, `@langchain/anthropic`, `@langchain/langgraph`, `js-yaml`, `zod`, `@google-cloud/storage` (already installed), `@google-cloud/bigquery` (already installed).

**Design doc:** `docs/plans/2026-02-27-jira-ticket-creation-agent-design.md`

---

## Pre-requisites (do before writing any code)

### Step 0a — Add BigQuery column

Run once in the BigQuery console:

```sql
ALTER TABLE `printerpix-general.GA_CG.seo_audit_results`
ADD COLUMN jira_tickets_gcs_path STRING;
```

Verify: query the table and confirm the column exists with all nulls.

### Step 0b — Set environment variables

Add to `.env.local`:

```
JIRA_BASE_URL=https://printerpix.atlassian.net
JIRA_EMAIL=<your-atlassian-account-email>
JIRA_API_KEY=<your-atlassian-api-key>
JIRA_PROJECT_KEY=ENG
```

The `ANTHROPIC_API_KEY` must already be set (used by the action plan agent).

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via yarn add)

**Step 1: Install js-yaml**

```bash
yarn add js-yaml
yarn add -D @types/js-yaml
```

**Step 2: Verify install**

```bash
node -e "const yaml = require('js-yaml'); console.log(yaml.load('key: value').key)"
```

Expected: `value`

**Step 3: Commit**

```bash
git add package.json yarn.lock
git commit -m "feat: install js-yaml for ticket-creation agent spec parsing"
```

---

## Task 2: Copy spec files into project

Copy the YAML spec files from the downloaded ecommerce-frontend-qwik-specs into the dashboard. These are the knowledge base the classifier agent reads.

**Step 1: Create the target directory**

```bash
mkdir -p src/lib/agents/ticket-creation/specs
```

**Step 2: Copy the spec files**

```bash
cp -r "/c/Users/Admin3k/Downloads/ecommerce-frontend-qwik-specs (1)/ecommerce-frontend-qwik-specs/.claude/seo-specs" \
  src/lib/agents/ticket-creation/specs/

cp -r "/c/Users/Admin3k/Downloads/ecommerce-frontend-qwik-specs (1)/ecommerce-frontend-qwik-specs/.claude/migration-specs" \
  src/lib/agents/ticket-creation/specs/
```

**Step 3: Verify the copy**

```bash
ls src/lib/agents/ticket-creation/specs/
# Expected: migration-specs  seo-specs

ls src/lib/agents/ticket-creation/specs/seo-specs/
# Expected: _api-guide.yaml  _architecture.yaml  _component-registry.yaml  _index.yaml  _service-registry.yaml  pages/

ls src/lib/agents/ticket-creation/specs/seo-specs/pages/ | wc -l
# Expected: 19
```

**Step 4: Update next.config.ts to bundle spec files in production**

Modify `next.config.ts` to:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/seo/audits/[auditId]/tickets": [
      "./src/lib/agents/ticket-creation/specs/**/*.yaml",
    ],
  },
};

export default nextConfig;
```

**Step 5: Commit**

```bash
git add src/lib/agents/ticket-creation/specs/ next.config.ts
git commit -m "feat: bundle ecommerce-frontend-qwik-specs for ticket-creation agent"
```

---

## Task 3: Add types

**Files:**
- Create: `src/lib/agents/ticket-creation/types.ts`
- Modify: `src/types/bigquery.ts`

**Step 1: Create `src/lib/agents/ticket-creation/types.ts`**

```typescript
// Raw audit JSON shapes (same as seo-action-plan, duplicated for independence)
export interface RawUrlIssue {
  issue_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description?: string;
  recommendation?: string;
  current_value?: string;
  expected_value?: string;
}

export interface RawUrlEntry {
  issues?: RawUrlIssue[];
}

export interface RawAuditJson {
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
  urls?: Record<string, RawUrlEntry>;
}

// One issue group with ALL affected URLs (richer than the action-plan IssueGroup)
export interface IssueGroupForTicket {
  issue_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  count: number;
  allUrls: string[];       // every URL affected (no cap — CSV handles large sets)
  exampleIssue: {          // one concrete example for the agent to reason from
    url: string;
    description?: string;
    recommendation?: string;
    current_value?: string;
    expected_value?: string;
  };
}

// Output from the classifier agent
export type Classification =
  | 'Frontend Rendering Issue'
  | 'API Data Issue - Field Exists'
  | 'API Data Issue - Field Missing'
  | 'Out of Scope';

export type TeamAssignment = 'Tech Team' | 'Data Team';

export type JiraPriority = 'Highest' | 'High' | 'Medium' | 'Low';

export interface DraftedTicket {
  issueGroup: IssueGroupForTicket;
  classification: Classification;
  team: TeamAssignment;
  priority: JiraPriority;
  objective: string;        // one-sentence summary → becomes Jira issue Summary field
  summary: string;          // 2-3 sentence explanation → Description ## Summary
  proposedSolution: string; // full proposed solution text → Description ## Proposed Solution
  relatedTo?: string[];     // issue_types this ticket relates to (for split tickets)
}

// Output from the Jira publisher
export interface JiraTicketResult {
  issueKey: string;
  jiraUrl: string;
  issueType: string;
  team: TeamAssignment;
  attachmentCreated: boolean;
}

export interface TicketCreationResult {
  status: 'complete' | 'exists';
  auditId: string;
  ticketsCreated: number;
  tickets: JiraTicketResult[];
  failures: Array<{ issueType: string; error: string }>;
  gcsPath: string;
}
```

**Step 2: Add `jira_tickets_gcs_path` to `src/types/bigquery.ts`**

Add the field after `action_plan_gcs_path`:

```typescript
jira_tickets_gcs_path?: string | null;
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
  jira_tickets_gcs_path?: string | null;
}
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/lib/agents/ticket-creation/types.ts src/types/bigquery.ts
git commit -m "feat: add ticket-creation types and jira_tickets_gcs_path to BigQuery row type"
```

---

## Task 4: Build the Issue Grouper

Pure TypeScript function — no LLM, no I/O. Groups raw audit JSON into `IssueGroupForTicket[]` sorted by severity then count.

**Files:**
- Create: `src/lib/agents/ticket-creation/grouper.ts`

**Step 1: Create `src/lib/agents/ticket-creation/grouper.ts`**

```typescript
import type { IssueGroupForTicket, RawAuditJson } from './types';

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Groups all URL-level issues from the raw audit JSON into per-issue-type groups.
 * Unlike the action-plan preprocessor, this collects ALL affected URLs (not just samples)
 * so the Jira publisher can attach a complete CSV when count > 5.
 */
export function groupIssuesForTickets(raw: RawAuditJson): IssueGroupForTicket[] {
  // key: `${issue_type}|||${severity}|||${category}`
  const groupMap = new Map<
    string,
    { allUrls: string[]; exampleIssue: IssueGroupForTicket['exampleIssue'] }
  >();

  const urls = raw.urls ?? {};

  for (const [url, entry] of Object.entries(urls)) {
    if (!entry.issues) continue;

    for (const issue of entry.issues) {
      const key = `${issue.issue_type}|||${issue.severity}|||${issue.category}`;
      const existing = groupMap.get(key);

      if (existing) {
        existing.allUrls.push(url);
      } else {
        groupMap.set(key, {
          allUrls: [url],
          exampleIssue: {
            url,
            description: issue.description,
            recommendation: issue.recommendation,
            current_value: issue.current_value,
            expected_value: issue.expected_value,
          },
        });
      }
    }
  }

  return Array.from(groupMap.entries())
    .map(([key, val]) => {
      const [issue_type, severity, category] = key.split('|||');
      return {
        issue_type,
        severity: severity as IssueGroupForTicket['severity'],
        category,
        count: val.allUrls.length,
        allUrls: val.allUrls,
        exampleIssue: val.exampleIssue,
      };
    })
    .sort((a, b) => {
      const sevDiff = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
      return sevDiff !== 0 ? sevDiff : b.count - a.count;
    });
}
```

**Step 2: Sanity-check the grouper manually**

Create a temporary test script `scripts/test-grouper.mjs`:

```javascript
import { readFileSync } from 'fs';

// Inline the grouper logic (stripped of types)
const raw = JSON.parse(readFileSync(
  'C:/Users/Admin3k/Downloads/printerpix.com_20260216_224451.json',
  'utf-8'
));

const groupMap = new Map();
for (const [url, entry] of Object.entries(raw.urls ?? {})) {
  for (const issue of (entry.issues ?? [])) {
    const key = `${issue.issue_type}|||${issue.severity}|||${issue.category}`;
    const ex = groupMap.get(key);
    if (ex) {
      ex.allUrls.push(url);
    } else {
      groupMap.set(key, {
        allUrls: [url],
        exampleIssue: { url, description: issue.description, recommendation: issue.recommendation },
      });
    }
  }
}

const groups = Array.from(groupMap.entries()).map(([key, val]) => ({
  issue_type: key.split('|||')[0],
  severity: key.split('|||')[1],
  category: key.split('|||')[2],
  count: val.allUrls.length,
})).sort((a, b) => b.count - a.count);

console.log(`Total issue groups: ${groups.length}`);
console.log('Top 10:');
groups.slice(0, 10).forEach(g =>
  console.log(`  ${g.count}x [${g.severity}] ${g.issue_type} (${g.category})`)
);
```

Run it:

```bash
node scripts/test-grouper.mjs
```

Expected output (example):

```
Total issue groups: ~20-50
Top 10:
  2100x [high] Missing HSTS (security)
  1566x [high] Not Indexed (indexation)
  ...
```

**Step 3: Delete the test script**

```bash
rm scripts/test-grouper.mjs
```

**Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/lib/agents/ticket-creation/grouper.ts
git commit -m "feat: add issue grouper for ticket-creation agent"
```

---

## Task 5: Build the LangChain classifier tools

Five tools that let the classifier agent read spec files and call the Printerpix API. All I/O, no LLM logic here.

**Files:**
- Create: `src/lib/agents/ticket-creation/tools.ts`

**Step 1: Create `src/lib/agents/ticket-creation/tools.ts`**

```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Resolve the specs directory relative to the project root
const SPECS_DIR = path.join(process.cwd(), 'src', 'lib', 'agents', 'ticket-creation', 'specs');

interface RoutingEntry {
  pattern: string;
  page_spec?: string;
  layout?: string;
  i18n_rewrites?: Record<string, string>;
  examples?: string[];
  notes?: string;
}

interface IndexYaml {
  routing_table?: RoutingEntry[];
}

const TLD_MAP: Record<string, string> = {
  GB: 'co.uk',
  US: 'com',
  DE: 'de',
  FR: 'fr',
  IT: 'it',
  ES: 'es',
  NL: 'nl',
  IN: 'in',
  AE: 'ae',
};

/**
 * Build the 5 LangChain tools for the classifier agent.
 */
export function buildClassifierTools(): DynamicStructuredTool[] {
  return [
    // ── Tool 1: readSpecFile ────────────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'readSpecFile',
      description:
        'Read any YAML spec file from the bundled specs directory. Use relative paths like ' +
        '"seo-specs/_index.yaml", "seo-specs/pages/home.yaml", ' +
        '"seo-specs/_api-guide.yaml", "seo-specs/_architecture.yaml", ' +
        '"migration-specs/backend/services/server.yaml". ' +
        'Returns the raw YAML content as a string.',
      schema: z.object({
        relativePath: z
          .string()
          .describe('Path relative to the specs/ directory, e.g. "seo-specs/pages/about-us.yaml"'),
      }),
      func: async ({ relativePath }) => {
        const fullPath = path.join(SPECS_DIR, relativePath);
        if (!fs.existsSync(fullPath)) {
          return (
            `Spec file not found: ${relativePath}. ` +
            `Available top-level dirs: seo-specs/, migration-specs/. ` +
            `Check the path and retry.`
          );
        }
        return fs.readFileSync(fullPath, 'utf-8');
      },
    }),

    // ── Tool 2: matchURLToRoute ─────────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'matchURLToRoute',
      description:
        'Match a URL path to the routing table in seo-specs/_index.yaml. ' +
        'Returns the matching routing entry (page_spec path, layout, i18n_rewrites) ' +
        'or an "out of scope" message if the URL does not match any known route. ' +
        'Always call this first with one of the affected URLs.',
      schema: z.object({
        urlPath: z
          .string()
          .describe('URL path to match (without domain), e.g. "/canvas-prints/" or "/about-us"'),
      }),
      func: async ({ urlPath }) => {
        const indexPath = path.join(SPECS_DIR, 'seo-specs/_index.yaml');
        const content = fs.readFileSync(indexPath, 'utf-8');
        const parsed = yaml.load(content) as IndexYaml;
        const routingTable = parsed.routing_table ?? [];

        // Normalise: strip trailing slash for comparison (except root "/")
        const normalize = (p: string) =>
          p === '/' ? '/' : p.replace(/\/$/, '');
        const normalUrl = normalize(urlPath);

        // 1. Exact match
        for (const entry of routingTable) {
          if (normalize(entry.pattern) === normalUrl) {
            return JSON.stringify(entry, null, 2);
          }
        }

        // 2. i18n rewrite match — check if url matches any known i18n rewrite value
        for (const entry of routingTable) {
          const rewrites = entry.i18n_rewrites ?? {};
          if (Object.values(rewrites).some((v) => normalize(v) === normalUrl)) {
            return (
              `Matched via i18n rewrite:\n` + JSON.stringify(entry, null, 2)
            );
          }
        }

        // 3. Dynamic catch-all — treat any unmatched path as product/category if it
        //    doesn't look like a known fixed path
        const catchAll = routingTable.find(
          (e) => e.pattern === '/[...productCategory]'
        );
        if (catchAll) {
          // Check if it looks like a product/category URL (has path segments after /)
          const segments = urlPath.replace(/^\/|\/$/g, '').split('/');
          if (segments.length >= 1 && segments[0]) {
            return (
              `Matched catch-all route (product/category page):\n` +
              JSON.stringify(catchAll, null, 2)
            );
          }
        }

        return (
          `No route matched for "${urlPath}". ` +
          `This URL is out of scope. Set classification to "Out of Scope" and ` +
          `include "Spec Coverage: Out of scope — manual investigation required" ` +
          `in the Proposed Solution.`
        );
      },
    }),

    // ── Tool 3: getPageSpec ─────────────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'getPageSpec',
      description:
        'Read a page SEO spec file to get the seo_contract (expected title, meta, structured data, ' +
        'hreflang, canonical) and file_chain (which functions/files generate each SEO element). ' +
        'Pass the page_spec value from matchURLToRoute, e.g. "pages/home.yaml". ' +
        'The tool auto-prefixes "seo-specs/" if needed.',
      schema: z.object({
        pageSpecPath: z
          .string()
          .describe(
            'Page spec path from the routing table entry, e.g. "pages/home.yaml" or "seo-specs/pages/home.yaml"'
          ),
      }),
      func: async ({ pageSpecPath }) => {
        // Normalise path — accept both "pages/x.yaml" and "seo-specs/pages/x.yaml"
        const normalized = pageSpecPath.startsWith('seo-specs/')
          ? pageSpecPath
          : `seo-specs/${pageSpecPath.startsWith('pages/') ? pageSpecPath : `pages/${pageSpecPath}`}`;

        const fullPath = path.join(SPECS_DIR, normalized);
        if (!fs.existsSync(fullPath)) {
          return `Page spec not found at ${normalized}. Check the path from matchURLToRoute.`;
        }
        return fs.readFileSync(fullPath, 'utf-8');
      },
    }),

    // ── Tool 4: getAPIGuide ─────────────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'getAPIGuide',
      description:
        'Read the API guide (seo-specs/_api-guide.yaml) which contains pre-generated ' +
        'MACHINE_TOKENs for all 9 regions (GB, US, DE, FR, IT, ES, NL, IN, AE) and example ' +
        'curl commands. Always call this before callPrinterpixAPI to get the correct token ' +
        'and request format for the region and endpoint you need.',
      schema: z.object({}),
      func: async () => {
        const guidePath = path.join(SPECS_DIR, 'seo-specs/_api-guide.yaml');
        if (!fs.existsSync(guidePath)) {
          return 'API guide not found. Classify conservatively as Frontend Rendering Issue.';
        }
        return fs.readFileSync(guidePath, 'utf-8');
      },
    }),

    // ── Tool 5: callPrinterpixAPI ───────────────────────────────────────────
    new DynamicStructuredTool({
      name: 'callPrinterpixAPI',
      description:
        'Call the Printerpix qt-api to verify whether an API field contains the correct value. ' +
        'Use this for API-driven SEO elements (title, meta description, canonical, robots, OG, ' +
        'structured data, breadcrumbs). Get the token from getAPIGuide first. ' +
        'Response is capped at 8 KB. If the call fails, classify as Frontend Rendering Issue.',
      schema: z.object({
        region: z
          .enum(['GB', 'US', 'DE', 'FR', 'IT', 'ES', 'NL', 'IN', 'AE'])
          .describe('Region to test — use the region most likely to be affected'),
        endpoint: z
          .string()
          .describe('API endpoint path, e.g. "/page/getPageData" or "/product/getProductPage"'),
        token: z
          .string()
          .describe('MACHINE_TOKEN from getAPIGuide for the selected region'),
        body: z
          .record(z.unknown())
          .describe('Request body as a JSON object, per the curl example in getAPIGuide'),
      }),
      func: async ({ region, endpoint, token, body }) => {
        const tld = TLD_MAP[region] ?? 'com';
        const baseUrl = `https://qt-api.printerpix.${tld}`;
        try {
          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            // 10-second timeout via AbortSignal
            signal: AbortSignal.timeout(10_000),
          });
          const json = await response.json();
          const text = JSON.stringify(json, null, 2);
          // Cap response to avoid flooding agent context
          return text.length > 8000 ? text.slice(0, 8000) + '\n... [truncated]' : text;
        } catch (error) {
          return (
            `API call failed: ${error instanceof Error ? error.message : String(error)}. ` +
            `Classify conservatively as Frontend Rendering Issue and note the API was unreachable.`
          );
        }
      },
    }),
  ];
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/lib/agents/ticket-creation/tools.ts
git commit -m "feat: add LangChain tools for ticket-creation classifier agent"
```

---

## Task 6: Build the Classifier Agent

One `createReactAgent` instance per issue group. Uses the 5 tools to investigate the issue, then outputs a structured JSON ticket draft in its final message.

**Files:**
- Create: `src/lib/agents/ticket-creation/classifier-agent.ts`

**Step 1: Create `src/lib/agents/ticket-creation/classifier-agent.ts`**

```typescript
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { buildClassifierTools } from './tools';
import type {
  IssueGroupForTicket,
  DraftedTicket,
  Classification,
  TeamAssignment,
  JiraPriority,
} from './types';

const SYSTEM_PROMPT = `You are a senior SEO engineer specialising in root-cause analysis and Jira ticket authoring.

You will be given ONE issue group from an SEO audit. Your job is to:
1. Classify the root cause (Frontend Rendering Issue / API Data Issue - Field Exists / API Data Issue - Field Missing / Out of Scope)
2. Draft a structured Jira ticket for that classification

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLASSIFICATION PROCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1 — Route the URL
  Call matchURLToRoute with the example URL. If "out of scope" → classification is "Out of Scope", skip to drafting.

Step 2 — Load the page spec
  Call getPageSpec with the page_spec value from matchURLToRoute. Read the seo_contract to find the affected SEO element (title, meta, canonical, robots, og, hreflang, structured data, heading, breadcrumb, etc.).

Step 3 — Is the element API-driven or frontend-generated?
  API-driven elements: title, meta description, canonical, robots meta, OG fields (og:title, og:description, og:image), structured data (JSON-LD in head), breadcrumbs
  Frontend-generated elements: hreflang <link> tags, any element the frontend constructs itself without reading an API field

  If frontend-generated → classification = "Frontend Rendering Issue" → go to Step 6

Step 4 — Verify the API field
  Call getAPIGuide to get the token and endpoint for the affected region.
  Call callPrinterpixAPI with the correct endpoint + token + body.
  Check whether the relevant field in the response has the correct value.

  If API field is WRONG or EMPTY → go to Step 5
  If API field is CORRECT but page renders it wrong → classification = "Frontend Rendering Issue" → go to Step 6

Step 5 — Does the API field exist in the response structure?
  Re-read the _api-guide.yaml (already loaded) and check the response_structure.data.* schema.
  If the field exists in the schema → classification = "API Data Issue - Field Exists" → go to Step 7
  If the field is absent from the schema → classification = "API Data Issue - Field Missing" → go to Step 7

Step 6 — Frontend Rendering Issue investigation
  Read the file_chain section of the page spec. Identify the exact source file path and function name responsible for generating the broken SEO element.
  Also check migration-specs via readSpecFile if needed (check implementation_logic, visibility_map, field_consumption).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEAM ASSIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend Rendering Issue       → Tech Team
API Data Issue - Field Exists  → Data Team
API Data Issue - Field Missing → Tech Team
Out of Scope                   → Tech Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITY MAPPING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

critical → Highest
high     → High
medium   → Medium
low      → Low

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TICKET WRITING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Data Team tickets (API Data Issue - Field Exists):
  - Plain backoffice language only
  - Do NOT include API field paths, JSON structure, curl commands, or source file names
  - Instructions must be completable by someone with backoffice access and no engineering knowledge
  - Describe: which content section to open, what the current incorrect value looks like, what it should be

Tech Team tickets (Frontend Rendering Issue or API Data Issue - Field Missing):
  - Reference exact source file paths and function names
  - For Frontend Rendering Issues: name the file, the function, and describe the logic change
  - For Field Missing: describe the new field needed, where in the response structure, and what frontend mapping to add

Out of Scope tickets:
  - Include: "Spec Coverage: Out of scope — manual investigation required"
  - Describe what was observed and note that the URL is not covered by the spec files

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TICKET TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Objective
[One sentence: which SEO element is broken, on which URL/page, what region(s) are affected]

## Summary
[2-3 sentences: what is wrong, how it was discovered, and the SEO/business impact]

## Proposed Solution
Classification: [classification]
Team: [team]

[Team-appropriate instructions]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After completing your investigation and drafting the ticket, output ONLY a valid JSON object
(no markdown fences, no extra text) matching this exact shape:

{
  "classification": "Frontend Rendering Issue | API Data Issue - Field Exists | API Data Issue - Field Missing | Out of Scope",
  "team": "Tech Team | Data Team",
  "priority": "Highest | High | Medium | Low",
  "objective": "one sentence",
  "summary": "2-3 sentences",
  "proposedSolution": "full proposed solution text including the Classification: and Team: lines"
}`;

const SEVERITY_TO_PRIORITY: Record<string, JiraPriority> = {
  critical: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/**
 * Extract JSON from the agent's final message.
 * Handles both raw JSON and JSON wrapped in markdown code fences.
 */
function extractJson(text: string): string {
  // Try to strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return text.trim();
}

/**
 * Run the classifier agent for one issue group.
 * Returns a DraftedTicket or throws on unrecoverable error.
 */
export async function runClassifierAgent(
  issueGroup: IssueGroupForTicket
): Promise<DraftedTicket> {
  const model = new ChatAnthropic({
    model: 'claude-sonnet-4-6',
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxTokens: 4096,
  });

  const tools = buildClassifierTools();

  const agent = createReactAgent({
    llm: model,
    tools,
  });

  const userMessage = `Classify and draft a ticket for this SEO issue group:

Issue Type: ${issueGroup.issue_type}
Severity: ${issueGroup.severity}
Category: ${issueGroup.category}
Affected URL count: ${issueGroup.count}

Example URL: ${issueGroup.exampleIssue.url}
Example description: ${issueGroup.exampleIssue.description ?? 'N/A'}
Example recommendation: ${issueGroup.exampleIssue.recommendation ?? 'N/A'}
Example current value: ${issueGroup.exampleIssue.current_value ?? 'N/A'}
Example expected value: ${issueGroup.exampleIssue.expected_value ?? 'N/A'}

Follow the classification process in your instructions. After investigating, output your JSON ticket draft.`;

  const result = await agent.invoke(
    {
      messages: [new HumanMessage(userMessage)],
    },
    {
      configurable: {
        system: SYSTEM_PROMPT,
      },
      // Prevent runaway agents — 15 tool calls max per issue
      recursionLimit: 20,
    }
  );

  // Extract the last AI message
  const messages = result.messages;
  const lastMessage = messages[messages.length - 1];

  let rawContent: string;
  if (typeof lastMessage.content === 'string') {
    rawContent = lastMessage.content;
  } else if (Array.isArray(lastMessage.content)) {
    rawContent = lastMessage.content
      .filter(
        (block): block is { type: 'text'; text: string } => block.type === 'text'
      )
      .map((block) => block.text)
      .join('\n');
  } else {
    throw new Error('Classifier agent returned unexpected message format');
  }

  // Parse the JSON output
  let parsed: {
    classification: string;
    team: string;
    priority: string;
    objective: string;
    summary: string;
    proposedSolution: string;
  };

  try {
    parsed = JSON.parse(extractJson(rawContent));
  } catch {
    throw new Error(
      `Classifier agent did not return valid JSON for issue "${issueGroup.issue_type}". ` +
        `Raw output: ${rawContent.slice(0, 500)}`
    );
  }

  // Validate and normalise fields with safe fallbacks
  const classification = (
    [
      'Frontend Rendering Issue',
      'API Data Issue - Field Exists',
      'API Data Issue - Field Missing',
      'Out of Scope',
    ].includes(parsed.classification)
      ? parsed.classification
      : 'Frontend Rendering Issue'
  ) as Classification;

  const team = (['Tech Team', 'Data Team'].includes(parsed.team)
    ? parsed.team
    : 'Tech Team') as TeamAssignment;

  const priority = (
    ['Highest', 'High', 'Medium', 'Low'].includes(parsed.priority)
      ? parsed.priority
      : SEVERITY_TO_PRIORITY[issueGroup.severity] ?? 'Medium'
  ) as JiraPriority;

  return {
    issueGroup,
    classification,
    team,
    priority,
    objective: parsed.objective ?? `Issue with ${issueGroup.issue_type}`,
    summary: parsed.summary ?? '',
    proposedSolution: parsed.proposedSolution ?? '',
  };
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/lib/agents/ticket-creation/classifier-agent.ts
git commit -m "feat: add LangChain ReAct classifier agent for ticket drafting"
```

---

## Task 7: Build the Jira Publisher

Pure HTTP calls — no LLM. Converts `DraftedTicket[]` to Jira issues using the REST API v3 with Atlassian Document Format descriptions. Attaches a CSV file when `affectedUrls.length > 5`.

**Files:**
- Create: `src/lib/agents/ticket-creation/jira-publisher.ts`

**Step 1: Create `src/lib/agents/ticket-creation/jira-publisher.ts`**

```typescript
import type { DraftedTicket, IssueGroupForTicket, JiraTicketResult, TeamAssignment } from './types';

// ── Jira configuration ──────────────────────────────────────────────────────

function getJiraConfig() {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiKey = process.env.JIRA_API_KEY;
  const projectKey = process.env.JIRA_PROJECT_KEY ?? 'ENG';

  if (!baseUrl || !email || !apiKey) {
    throw new Error(
      'Missing Jira environment variables. Required: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_KEY'
    );
  }

  const authHeader = `Basic ${Buffer.from(`${email}:${apiKey}`).toString('base64')}`;
  return { baseUrl, authHeader, projectKey };
}

// ── ADF (Atlassian Document Format) builder ─────────────────────────────────

type AdfNode =
  | { type: 'doc'; version: 1; content: AdfNode[] }
  | { type: 'heading'; attrs: { level: number }; content: AdfNode[] }
  | { type: 'paragraph'; content: AdfNode[] }
  | { type: 'text'; text: string; marks?: Array<{ type: string }> }
  | { type: 'rule' }
  | { type: 'bulletList'; content: AdfNode[] }
  | { type: 'listItem'; content: AdfNode[] };

function adfText(text: string, bold = false): AdfNode {
  const node: AdfNode = { type: 'text', text };
  if (bold) (node as { type: 'text'; text: string; marks?: Array<{ type: string }> }).marks = [{ type: 'strong' }];
  return node;
}

function adfHeading(level: number, text: string): AdfNode {
  return { type: 'heading', attrs: { level }, content: [adfText(text)] };
}

function adfParagraph(text: string): AdfNode {
  return { type: 'paragraph', content: [adfText(text)] };
}

function adfRule(): AdfNode {
  return { type: 'rule' };
}

/**
 * Convert a ticket's text fields into Atlassian Document Format (ADF).
 * ADF is the JSON format Jira's REST API v3 requires for rich text fields.
 */
function buildAdfDescription(
  ticket: DraftedTicket,
  urlCount: number,
  sampleUrls: string[]
): AdfNode {
  const content: AdfNode[] = [
    adfHeading(2, 'Objective'),
    adfParagraph(ticket.objective),
    adfHeading(2, 'Summary'),
    adfParagraph(ticket.summary),
    adfHeading(2, 'Proposed Solution'),
    adfParagraph(ticket.proposedSolution),
    adfRule(),
  ];

  // Affected URLs section
  if (urlCount <= 5) {
    content.push(
      adfHeading(3, `Affected URLs (${urlCount})`),
      ...sampleUrls.map((url) => adfParagraph(url))
    );
  } else {
    content.push(
      adfHeading(3, `Affected URLs`),
      adfParagraph(
        `${urlCount} URLs affected — see attached CSV file for complete list.`
      ),
      adfHeading(4, 'Sample (first 5):'),
      ...sampleUrls.slice(0, 5).map((url) => adfParagraph(url))
    );
  }

  return { type: 'doc', version: 1, content };
}

// ── CSV generation ──────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function generateAffectedUrlsCsv(issueGroup: IssueGroupForTicket): string {
  const header = 'url,issue_type,severity,category,current_value,expected_value\n';
  const rows = issueGroup.allUrls.map((url) => {
    const isExample = url === issueGroup.exampleIssue.url;
    return [
      url,
      issueGroup.issue_type,
      issueGroup.severity,
      issueGroup.category,
      isExample ? (issueGroup.exampleIssue.current_value ?? '') : '',
      isExample ? (issueGroup.exampleIssue.expected_value ?? '') : '',
    ]
      .map((v) => csvEscape(String(v ?? '')))
      .join(',');
  });
  return header + rows.join('\n');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Label normalisation ─────────────────────────────────────────────────────

function teamToLabel(team: TeamAssignment): string {
  return team === 'Tech Team' ? 'Tech-Team' : 'Data-Team';
}

// ── Jira REST API calls ─────────────────────────────────────────────────────

interface JiraCreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

async function createJiraIssue(
  ticket: DraftedTicket,
  config: ReturnType<typeof getJiraConfig>
): Promise<JiraCreateIssueResponse> {
  const { baseUrl, authHeader, projectKey } = config;

  const urlCount = ticket.issueGroup.allUrls.length;
  const sampleUrls = ticket.issueGroup.allUrls;

  const body = {
    fields: {
      project: { key: projectKey },
      summary: ticket.objective,
      description: buildAdfDescription(ticket, urlCount, sampleUrls),
      issuetype: { name: 'Task' },
      labels: ['SEO', teamToLabel(ticket.team)],
      priority: { name: ticket.priority },
    },
  };

  const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Jira issue creation failed (${response.status}): ${errorText.slice(0, 500)}`
    );
  }

  return response.json() as Promise<JiraCreateIssueResponse>;
}

async function attachCsvToJiraIssue(
  issueKey: string,
  issueGroup: IssueGroupForTicket,
  config: ReturnType<typeof getJiraConfig>
): Promise<void> {
  const { baseUrl, authHeader } = config;
  const csvContent = generateAffectedUrlsCsv(issueGroup);
  const fileName = `affected-urls-${slugify(issueGroup.issue_type)}.csv`;

  const formData = new FormData();
  formData.append(
    'file',
    new Blob([csvContent], { type: 'text/csv' }),
    fileName
  );

  const response = await fetch(
    `${baseUrl}/rest/api/3/issue/${issueKey}/attachments`,
    {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        // Required by Jira to allow attachments without CSRF token
        'X-Atlassian-Token': 'no-check',
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Jira attachment failed for ${issueKey} (${response.status}): ${errorText.slice(0, 300)}`
    );
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface PublishResult {
  success: boolean;
  ticket?: JiraTicketResult;
  error?: string;
}

/**
 * Publish all drafted tickets to Jira sequentially.
 * Sequential (not parallel) to respect Jira's rate limits.
 * Returns results for both successes and failures.
 */
export async function publishTicketsToJira(
  draftedTickets: DraftedTicket[]
): Promise<PublishResult[]> {
  const config = getJiraConfig();
  const results: PublishResult[] = [];

  for (const ticket of draftedTickets) {
    try {
      // Create the Jira issue
      const { key: issueKey } = await createJiraIssue(ticket, config);
      const jiraUrl = `${config.baseUrl}/browse/${issueKey}`;

      // Attach CSV if more than 5 URLs affected
      let attachmentCreated = false;
      if (ticket.issueGroup.allUrls.length > 5) {
        await attachCsvToJiraIssue(issueKey, ticket.issueGroup, config);
        attachmentCreated = true;
      }

      results.push({
        success: true,
        ticket: {
          issueKey,
          jiraUrl,
          issueType: ticket.issueGroup.issue_type,
          team: ticket.team,
          attachmentCreated,
        },
      });
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/lib/agents/ticket-creation/jira-publisher.ts
git commit -m "feat: add Jira publisher with ADF description builder and CSV attachment"
```

---

## Task 8: Build the Pipeline

Orchestrates all 3 stages: Issue Grouper → batched Classifier → Jira Publisher → GCS storage.

**Files:**
- Create: `src/lib/agents/ticket-creation/pipeline.ts`

**Step 1: Create `src/lib/agents/ticket-creation/pipeline.ts`**

```typescript
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
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/lib/agents/ticket-creation/pipeline.ts
git commit -m "feat: add ticket-creation pipeline orchestrator (3-stage, batched parallel)"
```

---

## Task 9: Build the API route

Mirrors the `action-plan/route.ts` pattern: idempotency check → GCS download → pipeline → BigQuery update.

**Files:**
- Create: `src/app/api/seo/audits/[auditId]/tickets/route.ts`

**Step 1: Create `src/app/api/seo/audits/[auditId]/tickets/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getBigQueryClient, getTableName } from '@/lib/bigquery';
import { getStorageClient, parseGcsUri } from '@/lib/gcs';
import { runTicketCreationPipeline } from '@/lib/agents/ticket-creation/pipeline';
import type { RawAuditJson } from '@/lib/agents/ticket-creation/types';

export const dynamic = 'force-dynamic';
// Agent pipeline can take several minutes for large audits (20+ issue groups × 3 parallel)
export const maxDuration = 300;

interface RouteParams {
  params: Promise<{ auditId: string }>;
}

interface AuditRow {
  report_gcs_path: string | null;
  jira_tickets_gcs_path: string | null;
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
      SELECT report_gcs_path, jira_tickets_gcs_path, domain, audit_date
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

  // 2. Idempotency — return early if tickets already created
  if (row.jira_tickets_gcs_path) {
    return NextResponse.json({
      status: 'exists',
      gcsPath: row.jira_tickets_gcs_path,
      auditId,
    });
  }

  if (!row.report_gcs_path) {
    return NextResponse.json(
      {
        error: 'No GCS report found for this audit — cannot create tickets without the raw audit JSON',
      },
      { status: 422 }
    );
  }

  try {
    // 3. Download raw audit JSON from GCS
    const parsed = parseGcsUri(row.report_gcs_path);
    if (!parsed) {
      throw new Error(`Invalid GCS URI: ${row.report_gcs_path}`);
    }

    const storage = getStorageClient();
    const [contents] = await storage
      .bucket(parsed.bucket)
      .file(parsed.path)
      .download();

    const rawJson = JSON.parse(contents.toString('utf-8')) as RawAuditJson;

    // 4. Resolve audit date string
    const auditDate =
      typeof row.audit_date === 'object' && row.audit_date !== null
        ? row.audit_date.value
        : row.audit_date;

    // 5. Run the 3-stage pipeline
    const result = await runTicketCreationPipeline(
      auditId,
      rawJson,
      row.domain,
      auditDate,
      parsed.bucket
    );

    // 6. Store GCS path back in BigQuery for idempotency
    await bq.query({
      query: `
        UPDATE \`${tableName}\`
        SET jira_tickets_gcs_path = @path
        WHERE audit_id = @auditId
      `,
      params: { path: result.gcsPath, auditId },
      location: 'US',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[tickets route] Pipeline failed:', error);
    return NextResponse.json(
      {
        error: 'Ticket creation pipeline failed',
        details:
          error instanceof Error ? error.message : String(error),
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

Expected: no errors.

**Step 3: Commit**

```bash
git add src/app/api/seo/audits/[auditId]/tickets/route.ts
git commit -m "feat: add POST tickets API route for Jira ticket creation"
```

---

## Task 10: End-to-end test

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Find a real auditId with a report_gcs_path**

Run in BigQuery console:

```sql
SELECT audit_id, domain, audit_date, report_gcs_path
FROM `printerpix-general.GA_CG.seo_audit_results`
WHERE report_gcs_path IS NOT NULL
ORDER BY audit_date DESC
LIMIT 1
```

Copy the `audit_id`.

**Step 3: Verify env vars are set**

```bash
node -e "
const vars = ['JIRA_BASE_URL','JIRA_EMAIL','JIRA_API_KEY','JIRA_PROJECT_KEY','ANTHROPIC_API_KEY'];
vars.forEach(v => console.log(v, '=', process.env[v] ? '✓ set' : '✗ MISSING'));
"
```

Expected: all 5 variables show `✓ set`.

**Step 4: Test Jira connectivity first (before running the agent)**

```bash
JIRA_BASE_URL=https://printerpix.atlassian.net
JIRA_EMAIL=your@email.com
JIRA_API_KEY=your-api-key

curl -s -u "$JIRA_EMAIL:$JIRA_API_KEY" \
  "$JIRA_BASE_URL/rest/api/3/project/ENG" \
  | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); console.log('Project name:', j.name, '| Key:', j.key)"
```

Expected: `Project name: Engineering Department | Key: ENG`

**Step 5: Call the endpoint**

```bash
curl -X POST http://localhost:3000/api/seo/audits/{AUDIT_ID_HERE}/tickets \
  -H "Content-Type: application/json"
```

This will take 3–10 minutes depending on how many issue groups exist. Watch the dev server logs for progress output like:

```
[ticket-pipeline] Grouped 23 issue types from audit ...
[ticket-pipeline] Classifying batch 1/8 (issues 1–3)
[ticket-pipeline] Classifying batch 2/8 (issues 4–6)
...
[ticket-pipeline] Created 21 Jira tickets. 2 publish failures.
[ticket-pipeline] Results stored at gs://...
```

Expected response:

```json
{
  "status": "complete",
  "auditId": "...",
  "ticketsCreated": 21,
  "tickets": [
    {
      "issueKey": "ENG-142",
      "jiraUrl": "https://printerpix.atlassian.net/browse/ENG-142",
      "issueType": "missing_hsts",
      "team": "Tech Team",
      "attachmentCreated": true
    },
    ...
  ],
  "failures": [],
  "gcsPath": "gs://your-bucket/tickets/printerpix.com/2026-02-16/tickets.json"
}
```

**Step 6: Verify idempotency**

Call the same endpoint again immediately:

```bash
curl -X POST http://localhost:3000/api/seo/audits/{AUDIT_ID_HERE}/tickets
```

Expected:

```json
{ "status": "exists", "gcsPath": "gs://...", "auditId": "..." }
```

**Step 7: Verify tickets in Jira**

Open `https://printerpix.atlassian.net/jira/software/c/projects/ENG/boards/247` and confirm:
- Tickets appear in the ENG board backlog
- Labels are `SEO` + `Tech-Team` or `Data-Team`
- Tickets with >5 URLs have a CSV attachment
- Description sections (Objective / Summary / Proposed Solution) render correctly

**Step 8: Verify BigQuery was updated**

```sql
SELECT audit_id, domain, jira_tickets_gcs_path
FROM `printerpix-general.GA_CG.seo_audit_results`
WHERE jira_tickets_gcs_path IS NOT NULL
LIMIT 5
```

**Step 9: Commit any fixups**

```bash
git add -p
git commit -m "fix: adjust ticket-creation agent after e2e testing"
```

---

## What was NOT implemented (intentionally)

- **No dashboard UI** — backend endpoint only; UI integration is a future iteration
- **No Jira epic/sprint assignment** — tickets land in backlog without epic linkage
- **No partial re-run** — if 3 tickets fail, re-running the full POST creates duplicates (the idempotency guard blocks it). Partial retry requires a separate endpoint.
- **No auth guard on the endpoint** — add middleware authentication consistent with the rest of the app if needed
- **No streaming** — the pipeline run is synchronous. For very large audits, consider wrapping in a background job pattern similar to `geo/research/run`
