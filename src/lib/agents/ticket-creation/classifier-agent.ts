import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
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

objective: A specific, actionable Jira ticket title derived from your investigation findings.
           Use the exact page name (from the spec), the SEO element, and the affected region(s).
           Format: "Fix [SEO element] on [page name] – [region or 'all regions']"
           Examples:
             "Fix missing meta description on Home page – all regions"
             "Fix H1 tag rendered as H3 on Category pages – GB & US"
             "Correct og:title field value on Product pages via backoffice – EU regions"
           MUST be under 200 characters. It becomes the Jira issue title.

summary: 2-3 sentences — what is wrong, how it was discovered, and the SEO/business impact.

proposedSolution: Full text including:
  Classification: [one of the four classifications]
  Team: [Tech Team or Data Team]
  [Team-appropriate instructions]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL STEP — REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After completing your investigation, you MUST call the submitTicket tool as your LAST action.
Do not write the ticket as text — call the tool. The task is not complete until submitTicket is called.`;

const SEVERITY_TO_PRIORITY: Record<string, JiraPriority> = {
  critical: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const ticketOutputSchema = z.object({
  classification: z
    .enum([
      'Frontend Rendering Issue',
      'API Data Issue - Field Exists',
      'API Data Issue - Field Missing',
      'Out of Scope',
    ])
    .describe('Root cause classification'),
  team: z
    .enum(['Tech Team', 'Data Team'])
    .describe('Team responsible for the fix'),
  priority: z
    .enum(['Highest', 'High', 'Medium', 'Low'])
    .describe('Jira priority level'),
  objective: z
    .string()
    .describe(
      'Specific Jira ticket title: "Fix [SEO element] on [page name] – [region]". Use exact page name from spec. Under 200 characters.'
    ),
  summary: z
    .string()
    .describe(
      '2-3 sentences: what is wrong, how discovered, SEO/business impact'
    ),
  proposedSolution: z
    .string()
    .describe(
      'Full proposed solution text including Classification and Team lines'
    ),
});

/**
 * Run the classifier agent for one issue group.
 * Uses a submitTicket tool to capture structured output — tool inputs are Zod-validated,
 * so this guarantees a well-formed response regardless of the agent's prose output.
 */
export async function runClassifierAgent(
  issueGroup: IssueGroupForTicket
): Promise<DraftedTicket> {
  const model = new ChatAnthropic({
    model: 'claude-sonnet-4-6',
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxTokens: 4096,
  });

  // Capture structured output from the submitTicket tool call via closure
  let capturedOutput: z.infer<typeof ticketOutputSchema> | null = null;

  const submitTicketTool = tool(
    async (input) => {
      capturedOutput = input;
      return 'Ticket submitted successfully. Your work is complete.';
    },
    {
      name: 'submitTicket',
      description:
        'Submit the final drafted Jira ticket. You MUST call this as your last action after completing your investigation.',
      schema: ticketOutputSchema,
    }
  );

  const allTools = [...buildClassifierTools(), submitTicketTool];

  const agent = createReactAgent({
    llm: model,
    tools: allTools,
    prompt: SYSTEM_PROMPT,
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

Follow the classification process in your instructions. After investigating, call submitTicket with your structured ticket data.`;

  await agent.invoke(
    { messages: [new HumanMessage(userMessage)] },
    { recursionLimit: 25 }
  );

  if (!capturedOutput) {
    throw new Error(
      `Classifier agent did not call submitTicket for issue "${issueGroup.issue_type}". ` +
        `The agent completed without submitting a structured ticket.`
    );
  }

  const output = capturedOutput;

  const priority = (
    ['Highest', 'High', 'Medium', 'Low'].includes(output.priority)
      ? output.priority
      : SEVERITY_TO_PRIORITY[issueGroup.severity] ?? 'Medium'
  ) as JiraPriority;

  return {
    issueGroup,
    classification: output.classification as Classification,
    team: output.team as TeamAssignment,
    priority,
    objective: output.objective ?? `Issue with ${issueGroup.issue_type}`,
    summary: output.summary ?? '',
    proposedSolution: output.proposedSolution ?? '',
  };
}
