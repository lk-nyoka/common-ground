import { NextRequest, NextResponse } from 'next/server';
import { planNight } from '../../../../lib/cg/agent';
import type { Session } from '../../../../lib/cg/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Plan tonight for two people. Calls Qloo (and the LLM agent, if configured). */
export async function POST(request: NextRequest) {
  try {
    const { session } = (await request.json()) as { session: Session };
    if (!session || !Array.isArray(session.people) || session.people.length !== 2) {
      return NextResponse.json({ error: 'Two people are needed' }, { status: 400 });
    }
    return NextResponse.json({ session: await planNight(session) });
  } catch (error: any) {
    console.error('cg plan failed', error);
    return NextResponse.json({ error: error?.message || 'Planning failed' }, { status: 500 });
  }
}
