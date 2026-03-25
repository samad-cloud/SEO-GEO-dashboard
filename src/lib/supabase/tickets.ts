import type { DraftedTicket } from '@/lib/agents/ticket-creation/types';
import { createAdminClient } from './admin';

export interface TicketRow {
  id: string;
  run_id: string;
  audit_id: string | null;
  domain: string;
  audit_date: string | null;
  issue_type: string;
  severity: string;
  category: string;
  affected_url_count: number;
  affected_urls: string[];
  affected_domains: string[];
  example_url: string | null;
  example_description: string | null;
  example_recommendation: string | null;
  example_current_value: string | null;
  example_expected_value: string | null;
  classification: string | null;
  team: string | null;
  priority: string | null;
  objective: string | null;
  summary: string | null;
  why_we_are_doing: string | null;
  proposed_solution: string | null;
  code_location: string | null;
  risk_and_implications: string | null;
  duplicate_of_issue_key: string | null;
  duplicate_of_jira_url: string | null;
  duplicate_of_run_date: string | null;
  related_to: string[] | null;
  jira_issue_key: string | null;
  jira_url: string | null;
  jira_attachment_created: boolean;
  jira_published_at: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

function draftedTicketToInsert(
  ticket: DraftedTicket,
  runId: string,
  auditId: string | null,
  domain: string,
  auditDate: string | null
): Omit<TicketRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    run_id: runId,
    audit_id: auditId,
    domain,
    audit_date: auditDate,
    issue_type: ticket.issueGroup.issue_type,
    severity: ticket.issueGroup.severity,
    category: ticket.issueGroup.category,
    affected_url_count: ticket.issueGroup.count,
    affected_urls: ticket.issueGroup.allUrls,
    affected_domains: ticket.issueGroup.affectedDomains,
    example_url: ticket.issueGroup.exampleIssue.url,
    example_description: ticket.issueGroup.exampleIssue.description ?? null,
    example_recommendation: ticket.issueGroup.exampleIssue.recommendation ?? null,
    example_current_value: ticket.issueGroup.exampleIssue.current_value ?? null,
    example_expected_value: ticket.issueGroup.exampleIssue.expected_value ?? null,
    classification: ticket.classification,
    team: ticket.team,
    priority: ticket.priority,
    objective: ticket.objective,
    summary: ticket.summary,
    why_we_are_doing: ticket.whyWeAreDoing,
    proposed_solution: ticket.proposedSolution,
    code_location: ticket.codeLocation,
    risk_and_implications: ticket.riskAndImplications,
    duplicate_of_issue_key: ticket.duplicateOf?.issueKey ?? null,
    duplicate_of_jira_url: ticket.duplicateOf?.jiraUrl ?? null,
    duplicate_of_run_date: ticket.duplicateOf?.runDate ?? null,
    related_to: ticket.relatedTo ?? null,
    jira_issue_key: null,
    jira_url: null,
    jira_attachment_created: false,
    jira_published_at: null,
    status: 'draft',
  };
}

export async function saveTicketsToSupabase(
  tickets: DraftedTicket[],
  runId: string,
  auditId: string | null,
  domain: string,
  auditDate: string | null
): Promise<TicketRow[]> {
  const supabase = createAdminClient();
  const rows = tickets.map((t) =>
    draftedTicketToInsert(t, runId, auditId, domain, auditDate)
  );

  const { data, error } = await supabase
    .from('tickets')
    .insert(rows)
    .select();

  if (error) throw new Error(`Failed to save tickets to Supabase: ${error.message}`);
  return (data ?? []) as TicketRow[];
}

export async function getTicketsByAuditId(auditId: string): Promise<TicketRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('audit_id', auditId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch tickets: ${error.message}`);
  return (data ?? []) as TicketRow[];
}

export async function getTicketsByRunId(runId: string): Promise<TicketRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch tickets: ${error.message}`);
  return (data ?? []) as TicketRow[];
}

export async function getTicketById(id: string): Promise<TicketRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as TicketRow;
}

export async function markTicketPublished(
  id: string,
  jiraIssueKey: string,
  jiraUrl: string,
  jiraAttachmentCreated: boolean
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('tickets')
    .update({
      jira_issue_key: jiraIssueKey,
      jira_url: jiraUrl,
      jira_attachment_created: jiraAttachmentCreated,
      jira_published_at: new Date().toISOString(),
      status: 'published',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`Failed to update ticket: ${error.message}`);
}

/** Reconstruct a DraftedTicket from a stored TicketRow for Jira publishing */
export function ticketRowToDraftedTicket(row: TicketRow): DraftedTicket {
  return {
    issueGroup: {
      issue_type: row.issue_type,
      severity: row.severity as DraftedTicket['issueGroup']['severity'],
      category: row.category,
      count: row.affected_url_count,
      allUrls: row.affected_urls,
      affectedDomains: row.affected_domains,
      exampleIssue: {
        url: row.example_url ?? '',
        description: row.example_description ?? undefined,
        recommendation: row.example_recommendation ?? undefined,
        current_value: row.example_current_value ?? undefined,
        expected_value: row.example_expected_value ?? undefined,
      },
    },
    classification: (row.classification as DraftedTicket['classification']) ?? 'Frontend Rendering Issue',
    team: (row.team as DraftedTicket['team']) ?? 'Tech Team',
    priority: (row.priority as DraftedTicket['priority']) ?? 'Medium',
    objective: row.objective ?? '',
    summary: row.summary ?? '',
    whyWeAreDoing: row.why_we_are_doing ?? '',
    proposedSolution: row.proposed_solution ?? '',
    codeLocation: row.code_location ?? '',
    riskAndImplications: row.risk_and_implications ?? '',
    duplicateOf: row.duplicate_of_issue_key
      ? {
          issueKey: row.duplicate_of_issue_key,
          jiraUrl: row.duplicate_of_jira_url ?? '',
          runDate: row.duplicate_of_run_date ?? '',
        }
      : undefined,
    relatedTo: row.related_to ?? undefined,
  };
}
