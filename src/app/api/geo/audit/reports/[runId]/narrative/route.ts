import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const apiUrl = process.env.GEO_API_URL ?? 'http://localhost:8000';
  const res = await fetch(`${apiUrl}/api/geo/audit/reports/${runId}/narrative`);
  if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const data = await res.json();
  return NextResponse.json(data);
}
