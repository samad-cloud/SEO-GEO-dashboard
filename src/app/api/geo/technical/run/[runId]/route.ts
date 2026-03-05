import { NextRequest, NextResponse } from 'next/server';

const GEO_API_BASE_URL = process.env.GEO_API_URL || 'http://localhost:8000';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  try {
    const res = await fetch(
      `${GEO_API_BASE_URL}/api/geo/technical/run/${encodeURIComponent(runId)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}
