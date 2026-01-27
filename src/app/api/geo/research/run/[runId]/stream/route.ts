/**
 * GEO Run Stream API Route (Server-Sent Events)
 *
 * GET: Stream live updates for a pipeline run
 *
 * This route proxies the SSE stream from the GEO backend.
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
      `${GEO_API_BASE_URL}/api/geo/research/run/${encodeURIComponent(runId)}/stream`,
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

    // Create a TransformStream to pass through the SSE data
    const { readable, writable } = new TransformStream();

    // Pipe the response body to our writable stream
    response.body?.pipeTo(writable).catch((err) => {
      console.error('Stream pipe error:', err);
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
    console.error('GEO API stream connection error:', error);

    // Return a mock SSE stream for development
    if (process.env.NODE_ENV === 'development') {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          // Send mock progress updates
          const stages = [
            { stage: 'initializing', progress: 5, step: 'Initializing...' },
            { stage: 'research', progress: 25, step: 'Running audit...' },
            { stage: 'analysis', progress: 50, step: 'Analyzing results...' },
            { stage: 'strategy', progress: 75, step: 'Creating tasks...' },
            { stage: 'complete', progress: 100, step: 'Complete!' },
          ];

          for (const s of stages) {
            const data = {
              run_id: runId,
              status: s.stage === 'complete' ? 'complete' : 'running',
              stage: s.stage,
              progress_percent: s.progress,
              current_step: s.step,
              messages_processed: Math.floor(s.progress / 25),
              tasks_created: s.progress > 50 ? 3 : 0,
              tasks_completed: s.progress > 75 ? 1 : 0,
              errors: [],
              timestamp: new Date().toISOString(),
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

            if (s.stage !== 'complete') {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    return NextResponse.json(
      { error: 'GEO API unavailable', details: String(error) },
      { status: 503 }
    );
  }
}
