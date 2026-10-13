import { NextRequest, NextResponse } from 'next/server';
import { qlooSearch } from '../../../../lib/qloo-client';
import { guarded } from '../../../../lib/server/http';

export const dynamic = 'force-dynamic';

/** Search Qloo by name. Used by the "Try it with someone you love" confirmation step. */
async function handle(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const type = searchParams.get('type') || undefined;
  if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 });
  const res = await qlooSearch(query, type, 5);
  return NextResponse.json({ source: res.source, capturedAt: res.capturedAt, error: res.error, results: res.data });
}

export async function GET(request: NextRequest) {
  return guarded(request, 'qloo_search', () => handle(request), { bucket: 'qloo', max: 150 });
}
