/**
 * Single Tracked URL API Route
 * Proxies to GEO backend: PATCH /api/geo/technical/urls/{urlId}
 */

import { NextRequest, NextResponse } from 'next/server';

const GEO_API_BASE_URL = process.env.GEO_API_URL || 'http://localhost:8000';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ urlId: string }> }
) {
  const { urlId } = await params;
  try {
    const body = await request.json();
    const response = await fetch(
      `${GEO_API_BASE_URL}/api/geo/technical/urls/${urlId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to update URL', details: errorText },
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
