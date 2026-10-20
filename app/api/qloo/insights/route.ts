import { NextRequest, NextResponse } from 'next/server';
import { qlooRelated } from '../../../../lib/qloo-client';
import { guarded } from '../../../../lib/server/http';

export const dynamic = 'force-dynamic';

/** Entities related to a Qloo entity. Used by the comparison script. */
async function handle(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get('entityId') || '';
  const rawType = searchParams.get('filterType') || 'urn:entity:artist';
  const targetType = /^urn:entity:[a-z_]{2,20}$/.test(rawType) ? rawType : 'urn:entity:artist';
  const maxYear = parseInt(searchParams.get('maxYear') || '', 10);
  if (!/^[A-Za-z0-9_:-]{1,80}$/.test(entityId)) return NextResponse.json({ error: 'A valid entityId is required' }, { status: 400 });
  const res = await qlooRelated(entityId, targetType, { take: 8, maxYear: Number.isFinite(maxYear) && maxYear > 1800 && maxYear < 2100 ? maxYear : undefined });
  return NextResponse.json({ source: res.source, capturedAt: res.capturedAt, error: res.error, yearFilterApplied: res.yearFilterApplied, results: res.data });
}

export async function GET(request: NextRequest) {
  return guarded(request, 'qloo_insights', () => handle(request), { bucket: 'qloo', max: 150 });
}
