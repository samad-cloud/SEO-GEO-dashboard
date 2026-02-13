/**
 * Single Audit Report API Route
 * Proxies to GEO backend: GET /api/geo/audit/reports/{reportId}
 */

import { NextRequest, NextResponse } from 'next/server';

const GEO_API_BASE_URL = process.env.GEO_API_URL || 'http://localhost:8000';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  try {
    const response = await fetch(
      `${GEO_API_BASE_URL}/api/geo/audit/reports/${reportId}`,
      { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'Failed to fetch audit report', details: errorText },
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
