import { NextRequest, NextResponse } from 'next/server';
import { planNight } from '../../../../lib/cg/agent';
import { picksOf } from '../../../../lib/cg/learn';
import { cleanSession, LIMITS, trimForClient } from '../../../../lib/cg/validate';
import { guarded, logPlan, readJson } from '../../../../lib/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Plan tonight for two people. Calls Qloo (and the LLM agent, if configured). */
export async function POST(request: NextRequest) {
  return guarded(request, 'plan', async () => {
    const started = Date.now();
    const body = (await readJson(request, LIMITS.bodyBytes)) as { session?: unknown };
    const session = await planNight(cleanSession(body?.session));
    logPlan('plan', started, session.plans[0], session.plans[0] ? picksOf(session.plans[0]).length : 0);
    return NextResponse.json({ session: trimForClient(session) });
  });
}
