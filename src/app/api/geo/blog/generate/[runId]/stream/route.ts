/**
 * Blog Generate Stream API Route (Server-Sent Events)
 * Proxies to GEO backend: GET /api/geo/blog/generate/{runId}/stream
 */

import { NextRequest, NextResponse } from 'next/server';

const GEO_API_BASE_URL = process.env.GEO_API_URL || 'http://localhost:8000';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  try {
    const response = await fetch(
      `${GEO_API_BASE_URL}/api/geo/blog/generate/${encodeURIComponent(runId)}/stream`,
      {
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to connect to stream' },
        { status: response.status }
      );
    }

    const { readable, writable } = new TransformStream();

    response.body?.pipeTo(writable).catch((err) => {
      console.error('Blog stream pipe error:', err);
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('GEO API blog stream connection error:', error);
    return NextResponse.json(
      { error: 'GEO API unavailable', details: String(error) },
      { status: 503 }
    );
  }
}
