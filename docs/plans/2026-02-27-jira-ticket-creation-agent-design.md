# Jira Ticket Creation Agent — Design

**Date:** 2026-02-27
**Status:** Approved
**Jira:** https://printerpix.atlassian.net | Project: `ENG` | Board: ENG board (ID 247)

---

## Problem

The ticket drafting workflow (documented in `middle-agent-ticket-drafting-plan.md`) currently runs as a manual Claude skill. A human reads an SEO audit, runs the skill, gets drafted tickets, and then manually creates them in Jira. This needs to be automated as a LangChain JS agent integrated into the dashboard.

---

## Solution Overview

A 3-stage pipeline triggered by `POST /api/seo/audits/[auditId]/tickets`:

1. **Issue Grouper** — pure TypeScript: downloads raw audit JSON from GCS, groups issues by type+severity+category, collects all affected URLs per group.
2. **Classifier + Drafter** — LangChain ReAct agent (one per issue group, up to 3 concurrent): reads bundled YAML specs, optionally calls the Printerpix API, classifies the root cause, drafts a structured ticket.
3. **Jira Publisher** — sequential HTTP calls (no LLM): converts drafted tickets to Atlassian Document Format, creates issues in the ENG project, attaches a CSV of affected URLs when count > 5.

Results are stored in GCS and the GCS path is written back to BigQuery for idempotency.

---

## Data Flow

```
POST /api/seo/audits/[auditId]/tickets
│
│  ① Fetch report_gcs_path from BigQuery
│  ② Download raw audit JSON from GCS
│
▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 1 — Issue Grouper (pure TypeScript, no LLM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Group issues by { issue_type + severity + category }
  Per group: collect ALL affected URLs + one example detail record
  Output: IssueGroupForTicket[]

▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 2 — Classifier + Drafter (ReAct agent, 3 groups in parallel)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  For each IssueGroupForTicket:

  Tools the agent can call:
    readSpecFile(relativePath)       → reads bundled YAML spec from specs/
    matchURLToRoute(url)             → queries _index.yaml routing_table
    getPageSpec(pageSpecPath)        → reads seo_contract + file_chain
    callPrinterpixAPI(region, path)  → HTTP to qt-api.printerpix.*
    getAPIGuide()                    → reads _api-guide.yaml

  Classification logic (from middle-agent-ticket-drafting-plan.md):
    Step 1: Is the affected SEO element API-driven or frontend-generated?
    Step 2: If API-driven → call API → is the field correct?
    Step 2a: If wrong → does the field exist in API response structure?
    Step 3: Frontend Rendering Issue (frontend-generated OR API correct but renders wrong)

  Output per group: DraftedTicket {
    classification, team, objective, summary,
    proposedSolution, affectedUrls[], priority
  }

▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAGE 3 — Jira Publisher (sequential HTTP, no LLM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  For each DraftedTicket:
    ① Build ADF description (Objective / Summary / Proposed Solution)
    ② POST /rest/api/3/issue → ENG project → get issueKey
    ③ If affectedUrls.length > 5:
         → generate affected-urls-{issueType}.csv
         → POST /rest/api/3/issue/{key}/attachments
    ④ Record { issueKey, jiraUrl }

▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STORE RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Write ticket keys JSON to GCS
  Store GCS path back in BigQuery (new column: jira_tickets_gcs_path)
  Return: { status, ticketsCreated, tickets: [{issueKey, jiraUrl}] }
```

---

## File Structure

```
src/lib/agents/ticket-creation/
  types.ts                 ← IssueGroupForTicket, DraftedTicket, JiraTicketResult
  grouper.ts               ← Stage 1: groups raw audit JSON into issue groups
  classifier-agent.ts      ← Stage 2: ReAct agent (classification + ticket drafting)
  jira-publisher.ts        ← Stage 3: Jira REST API calls (create + attach)
  pipeline.ts              ← Orchestrates all 3 stages, handles concurrency
  specs/                   ← Bundled YAML files (copied from ecommerce-frontend-qwik-specs)
    seo-specs/
      _index.yaml
      _api-guide.yaml
      _architecture.yaml
      _component-registry.yaml
      _service-registry.yaml
      pages/  (19 .yaml files)
    migration-specs/
      (full tree — 189 .yaml files)

src/app/api/seo/audits/[auditId]/tickets/
  route.ts                 ← POST endpoint
```

---

## Jira Ticket Shape

```
Project key:  ENG
Issue type:   Task
Summary:      [Objective line — one sentence]

Description (Atlassian Document Format):
  ## Objective
  [Which SEO element, which URL/page, which region(s)]

  ## Summary
  [What is wrong, how discovered, SEO/business impact]

  ## Proposed Solution
  Classification: Frontend Rendering Issue
              | API Data Issue - Field Exists
              | API Data Issue - Field Missing
  Team: Tech Team | Data Team

  [Team-appropriate instructions per middle-agent-ticket-drafting-plan.md rules]

  ---
  Affected URLs: 3 (inline, listed in description)   ← when ≤ 5
  Affected URLs: 47 — see attached CSV               ← when > 5

Labels:     ["SEO", "Tech-Team"]  |  ["SEO", "Data-Team"]
Priority:   Critical → Highest | High → High | Medium → Medium | Low → Low
Attachment: affected-urls-{issue_type_slug}.csv  (only when URL count > 5)
```

### CSV attachment columns

```
url, issue_type, severity, category, current_value, expected_value
```

---

## Classifier Agent — Tools

| Tool | Input | Output |
|---|---|---|
| `readSpecFile` | `relativePath: string` | YAML file content as string |
| `matchURLToRoute` | `url: string` | Routing table entry or "out of scope" |
| `getPageSpec` | `pageSpecPath: string` | Parsed page spec (seo_contract + file_chain) |
| `callPrinterpixAPI` | `region: string, urlPath: string` | API response JSON |
| `getAPIGuide` | `section?: string` | Relevant section of _api-guide.yaml |

---

## Classifier Agent — System Prompt Structure

The system prompt encodes the full classification logic from `middle-agent-ticket-drafting-plan.md`:

1. Read the issue group (type, severity, category, sample URLs)
2. Use `matchURLToRoute` to find which page spec applies
3. Use `getPageSpec` to load the `seo_contract` — check if the affected element is API-driven or frontend-generated
4. If API-driven: use `callPrinterpixAPI` to verify the field value
5. If API field correct but renders wrong → Frontend Rendering Issue
6. If API field wrong → check `getAPIGuide` to see if field exists in structure
7. Read relevant migration-spec sections (`field_consumption`, `implementation_logic`, `visibility_map`) via `readSpecFile` when needed
8. Draft the ticket using the correct writing rules per team (plain backoffice language for Data Team, technical file/function references for Tech Team)
9. If the URL is out of scope → flag as `Spec Coverage: Out of scope`
10. If issue spans multiple root causes → draft separate tickets and note `Related to:` references

---

## Concurrency Model

Stage 2 runs up to 3 classifier agents in parallel using `Promise.allSettled` batching:

```typescript
const BATCH_SIZE = 3;
for (let i = 0; i < issueGroups.length; i += BATCH_SIZE) {
  const batch = issueGroups.slice(i, i + BATCH_SIZE);
  const results = await Promise.allSettled(batch.map(runClassifierAgent));
  // collect results, log failures
}
```

Stage 3 (Jira publisher) runs sequentially to avoid Jira rate limits.

---

## Idempotency

- New BigQuery column: `jira_tickets_gcs_path STRING` (nullable)
- If column is non-null for the requested `auditId` → return `{ status: "exists", gcsPath }` immediately
- On success → write `tickets/[domain]/[auditDate]/tickets.json` to GCS → store path in BigQuery

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| URL not in routing table | Ticket created with `Spec Coverage: Out of scope — manual investigation required` |
| Printerpix API unreachable | Classify conservatively as Frontend Rendering Issue, note in ticket |
| Multiple root causes in one issue | Split into 2 tickets with `Related to:` cross-reference |
| Jira create fails for one ticket | Log error, continue remaining tickets, include `failures[]` in response |
| Spec file not found | Log warning, agent uses best-effort classification from available data |

---

## Environment Variables

```bash
JIRA_BASE_URL=https://printerpix.atlassian.net
JIRA_EMAIL=<provided at runtime>
JIRA_API_KEY=<provided at runtime>
JIRA_PROJECT_KEY=ENG
ANTHROPIC_API_KEY=<already set>
```

---

## API Contract

### Request
```
POST /api/seo/audits/{auditId}/tickets
Content-Type: application/json
(no body required — all inputs resolved from BigQuery)
```

### Response — success
```json
{
  "status": "complete",
  "auditId": "...",
  "ticketsCreated": 12,
  "tickets": [
    { "issueKey": "ENG-142", "jiraUrl": "https://printerpix.atlassian.net/browse/ENG-142", "issueType": "missing_meta_description", "team": "Data Team" },
    ...
  ],
  "failures": [],
  "gcsPath": "gs://bucket/tickets/printerpix.com/2026-02-16/tickets.json"
}
```

### Response — already exists
```json
{
  "status": "exists",
  "auditId": "...",
  "gcsPath": "gs://bucket/tickets/printerpix.com/2026-02-16/tickets.json"
}
```

---

## BigQuery Schema Change

```sql
ALTER TABLE `printerpix-general.GA_CG.seo_audit_results`
ADD COLUMN jira_tickets_gcs_path STRING;
```

---

## Out of Scope (intentionally)

- No dashboard UI for this endpoint (backend only for now)
- No Jira epic/sprint assignment (tickets land in backlog)
- No webhook to notify teams (future iteration)
- No re-run / partial re-run of failed tickets (manual retry via POST)
