/**
 * GEO Individual Run Status API Route
 *
 * GET: Get status of a specific run
 */

import { NextRequest, NextResponse } from 'next/server';

const GEO_API_BASE_URL = process.env.GEO_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    const response = await fetch(
      `${GEO_API_BASE_URL}/api/geo/research/run/${encodeURIComponent(runId)}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch run status', details: errorText },
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
