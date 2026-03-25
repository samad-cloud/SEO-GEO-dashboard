import { NextRequest, NextResponse } from 'next/server';
import { getTicketsByAuditId } from '@/lib/supabase/tickets';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface RouteParams {
  params: Promise<{ auditId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { auditId } = await params;

  if (!auditId) {
    return NextResponse.json({ error: 'Audit ID is required' }, { status: 400 });
  }

  try {
    const tickets = await getTicketsByAuditId(auditId);

    if (tickets.length === 0) {
      return NextResponse.json({ status: 'not_generated' });
    }

    const published = tickets.filter((t) => t.status === 'published');
    const drafts = tickets.filter((t) => t.status === 'draft');

    return NextResponse.json({
      status: 'complete',
      auditId,
      ticketsDrafted: tickets.length,
      ticketsPublished: published.length,
      ticketsDraft: drafts.length,
      createdAt: tickets[0].created_at,
      tickets,
    });
  } catch (error) {
    console.error('[tickets/results]', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
