import { NextRequest, NextResponse } from 'next/server';
import { planNight } from '../../../../lib/cg/agent';
import { applyFeedback } from '../../../../lib/cg/learn';
import type { Session, Verdict } from '../../../../lib/cg/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Record both people's reactions, then plan the next night from what they loved. */
export async function POST(request: NextRequest) {
  try {
    const { session, verdicts } = (await request.json()) as { session: Session; verdicts: Record<string, Verdict> };
    if (!session || !verdicts || Object.keys(verdicts).length === 0) {
      return NextResponse.json({ error: 'At least one reaction is needed' }, { status: 400 });
    }
    return NextResponse.json({ session: await planNight(applyFeedback(session, verdicts)) });
  } catch (error: any) {
    console.error('cg feedback failed', error);
    return NextResponse.json({ error: error?.message || 'Could not save reactions' }, { status: 500 });
  }
}
