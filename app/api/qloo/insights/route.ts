import { NextRequest, NextResponse } from 'next/server';
import { getQlooInsights } from '../../../../lib/qloo-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');
    const targetType = searchParams.get('filterType') || 'urn:entity:artist';
    const seedName = searchParams.get('seedName') || 'seed';
    const take = parseInt(searchParams.get('take') || '4', 10);

    if (!entityId) {
      return NextResponse.json({ error: 'entityId is required' }, { status: 400 });
    }

    const insights = await getQlooInsights(entityId, targetType, seedName, take);
    return NextResponse.json({ insights });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Insights query failed' }, { status: 500 });
  }
}
