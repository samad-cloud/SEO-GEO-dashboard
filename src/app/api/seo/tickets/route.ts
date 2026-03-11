/**
 * /api/seo/tickets — thin proxy to the GEO backend.
 *
 * The ticket generation pipeline (classifier agents, reviewer, Jira publisher)
 * runs in the GEO FastAPI service which has no serverless timeout constraints.
 * This route simply forwards the request and streams the response back.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GEO_API_BASE = process.env.GEO_API_URL || 'http://localhost:8000';
const UPSTREAM = `${GEO_API_BASE}/api/seo/tickets`;

async function proxy(method: 'GET' | 'POST'): Promise<NextResponse> {
  try {
    const upstream = await fetch(UPSTREAM, {
      method,
      headers: { 'Content-Type': 'application/json' },
      // No timeout — the GEO backend manages its own execution time
    });

    const body = await upstream.text();

    // Try to parse as JSON; fall back to raw text on parse error
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { error: 'Invalid response from backend', raw: body.slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json(json, { status: upstream.status });
  } catch (error) {
    console.error(`[seo/tickets proxy] ${method} failed:`, error);
    return NextResponse.json(
      {
        error: 'Failed to reach ticket generation service',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  return proxy('GET');
}

export async function POST() {
  return proxy('POST');
}
