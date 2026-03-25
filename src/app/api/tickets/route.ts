import { NextRequest, NextResponse } from 'next/server';
import { getAllTickets, getTicketsByAuditId, getTicketsByRunId } from '@/lib/supabase/tickets';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const auditId = searchParams.get('auditId');
  const runId = searchParams.get('runId');

  try {
    const tickets = auditId
      ? await getTicketsByAuditId(auditId)
      : runId
      ? await getTicketsByRunId(runId)
      : await getAllTickets();

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('[GET /api/tickets]', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
