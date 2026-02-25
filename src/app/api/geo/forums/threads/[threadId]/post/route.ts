/**
 * Forum Thread Post (Retry) API Route
 * Proxies to GEO backend:
 *   POST /api/geo/forums/threads/{threadId}/post
 */

import { NextRequest, NextResponse } from 'next/server';

const GEO_API_BASE_URL = process.env.GEO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  if (!/^[a-f0-9-]+$/i.test(threadId)) {
    return NextResponse.json({ error: 'Invalid thread ID' }, { status: 400 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const response = await fetch(
      `${GEO_API_BASE_URL}/api/geo/forums/threads/${threadId}/post`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to post thread', details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json(
      { error: 'GEO API unavailable', details: String(error) },
      { status: 503 }
    );
  }
}
