import { NextRequest, NextResponse } from 'next/server';
import { qlooRelated } from '../../../../lib/qloo-client';

export const dynamic = 'force-dynamic';

/** Entities related to a Qloo entity. Used by the comparison script. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get('entityId');
  const targetType = searchParams.get('filterType') || 'urn:entity:artist';
  const maxYear = searchParams.get('maxYear');
  if (!entityId) return NextResponse.json({ error: 'entityId is required' }, { status: 400 });
  const res = await qlooRelated(entityId, targetType, { take: 8, maxYear: maxYear ? parseInt(maxYear, 10) : undefined });
  return NextResponse.json({ source: res.source, capturedAt: res.capturedAt, error: res.error, yearFilterApplied: res.yearFilterApplied, results: res.data });
}
