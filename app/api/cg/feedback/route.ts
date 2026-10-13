import { NextRequest, NextResponse } from 'next/server';
import { planNight } from '../../../../lib/cg/agent';
import { applyFeedback, picksOf } from '../../../../lib/cg/learn';
import { cleanSession, cleanVerdicts, InputError, LIMITS, trimForClient } from '../../../../lib/cg/validate';
import { guarded, logPlan, readJson } from '../../../../lib/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Record both people's reactions, then plan the next night from what they loved. */
export async function POST(request: NextRequest) {
  return guarded(request, 'feedback', async () => {
    const started = Date.now();
    const body = (await readJson(request, LIMITS.bodyBytes)) as { session?: unknown; verdicts?: unknown };
    const session = cleanSession(body?.session);
    if (!session.plans.length) throw new InputError('There is no plan to react to yet.');
    const next = await planNight(applyFeedback(session, cleanVerdicts(body?.verdicts)));
    logPlan('feedback_plan', started, next.plans[0], next.plans[0] ? picksOf(next.plans[0]).length : 0);
    return NextResponse.json({ session: trimForClient(next) });
  });
}
