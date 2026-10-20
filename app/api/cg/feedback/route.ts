import { NextRequest, NextResponse } from 'next/server';
import { planNight } from '../../../../lib/cg/agent';
import { applyFeedback, picksOf } from '../../../../lib/cg/learn';
import { cleanSession, cleanVerdicts, InputError, LIMITS, trimForClient } from '../../../../lib/cg/validate';
import { guarded, logPlan, readJson } from '../../../../lib/server/http';
import { streamPlan } from '../../../../lib/server/stream';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Record both people's reactions, then plan the next night from what they loved. Streams like /plan. */
export async function POST(request: NextRequest) {
  return guarded(request, 'feedback', async () => {
    const started = Date.now();
    const body = (await readJson(request, LIMITS.bodyBytes)) as { session?: unknown; verdicts?: unknown };
    const session = cleanSession(body?.session);
    if (!session.plans.length) throw new InputError('There is no plan to react to yet.');
    const updated = applyFeedback(session, cleanVerdicts(body?.verdicts));
    const finish = (s: Awaited<ReturnType<typeof planNight>>) => {
      logPlan('feedback_plan', started, s.plans[0], s.plans[0] ? picksOf(s.plans[0]).length : 0);
      return trimForClient(s);
    };
    if (request.headers.get('accept')?.includes('application/x-ndjson')) {
      return streamPlan(async (onStep) => finish(await planNight(updated, { onStep })));
    }
    return NextResponse.json({ session: finish(await planNight(updated)) });
  });
}
