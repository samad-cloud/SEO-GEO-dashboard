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
      assignee: { accountId: '70121:0205e0a0-7507-4a40-9a91-3167116851d0' },
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
