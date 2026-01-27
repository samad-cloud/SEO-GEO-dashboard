/**
 * GEO Run Cancel API Route
 *
 * POST: Cancel a running pipeline
 */

import { NextRequest, NextResponse } from 'next/server';

const GEO_API_BASE_URL = process.env.GEO_API_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    const response = await fetch(
      `${GEO_API_BASE_URL}/api/geo/research/run/${encodeURIComponent(runId)}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to cancel run', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GEO API connection error:', error);
    return NextResponse.json(
      { error: 'GEO API unavailable', details: String(error) },
      { status: 503 }
    );
  }
}
