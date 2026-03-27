import { NextResponse } from 'next/server';
import { PRINTERPIX_DOMAINS, INKS_DOMAINS, JOB_PRINTERPIX, JOB_INKS } from '@/lib/gcp/cloud-run-jobs';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    groups: [
      {
        label: 'PrinterPix',
        job: JOB_PRINTERPIX,
        domains: PRINTERPIX_DOMAINS,
      },
      {
        label: 'Inks',
        job: JOB_INKS,
        domains: INKS_DOMAINS,
      },
    ],
    all: [...PRINTERPIX_DOMAINS, ...INKS_DOMAINS],
  });
}
