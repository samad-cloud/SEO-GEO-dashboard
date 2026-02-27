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
