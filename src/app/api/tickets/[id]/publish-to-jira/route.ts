import { NextRequest, NextResponse } from 'next/server';
import { getTicketById, markTicketPublished, ticketRowToDraftedTicket } from '@/lib/supabase/tickets';
import { publishSingleTicketToJira } from '@/lib/agents/ticket-creation/jira-publisher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const ticket = await getTicketById(id);
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }
  if (ticket.status === 'published') {
    return NextResponse.json({
      status: 'already_published',
      jiraIssueKey: ticket.jira_issue_key,
      jiraUrl: ticket.jira_url,
    });
  }

  try {
    const drafted = ticketRowToDraftedTicket(ticket);
    const result = await publishSingleTicketToJira(drafted);

    await markTicketPublished(id, result.issueKey, result.jiraUrl, result.attachmentCreated);

    return NextResponse.json({
      status: 'published',
      jiraIssueKey: result.issueKey,
      jiraUrl: result.jiraUrl,
      attachmentCreated: result.attachmentCreated,
    });
  } catch (error) {
    console.error(`[publish-to-jira] Failed for ticket ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to publish to Jira', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
