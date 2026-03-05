/**
 * WordPress Draft Push API Route
 * Proxies to GEO backend: POST /api/geo/blog/posts/{post_id}/push-to-wordpress
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

const GEO_API_BASE_URL = process.env.GEO_API_URL || 'http://localhost:8000';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;

  try {
    const response = await fetch(
      `${GEO_API_BASE_URL}/api/geo/blog/posts/${postId}/push-to-wordpress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { detail: 'Failed to reach GEO backend', details: String(error) },
      { status: 502 }
    );
  }
}
