/**
 * GEO Research API Route
 *
 * Proxies requests to the GEO backend API.
 * GET: Fetch latest research data
 */

import { NextResponse } from 'next/server';

const GEO_API_BASE_URL = process.env.GEO_API_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const response = await fetch(`${GEO_API_BASE_URL}/api/geo/research`, {
      headers: {
        'Content-Type': 'application/json',
      },
      // Don't cache to always get fresh data
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GEO API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch research data', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GEO API connection error:', error);

    // Return sample data in development if API is unavailable
    if (process.env.NODE_ENV === 'development') {
      const { sampleResearchRun } = await import('@/data/sample-geo');
      return NextResponse.json({
        ...sampleResearchRun,
        _mock: true,
        _message: 'Using sample data - GEO API unavailable',
      });
    }

    return NextResponse.json(
      { error: 'GEO API unavailable', details: String(error) },
      { status: 503 }
    );
  }
}
