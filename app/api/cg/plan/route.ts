import { NextRequest, NextResponse } from 'next/server';
import { planNight } from '../../../../lib/cg/agent';
import { picksOf } from '../../../../lib/cg/learn';
import { cleanSession, LIMITS, trimForClient } from '../../../../lib/cg/validate';
import { guarded, logPlan, readJson } from '../../../../lib/server/http';
import { streamPlan } from '../../../../lib/server/stream';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Plan tonight for two people. Calls Qloo (and the LLM agent, if configured).
 * Send `Accept: application/x-ndjson` to receive the agent's steps live, then the result.
 */
export async function POST(request: NextRequest) {
  return guarded(request, 'plan', async () => {
    const started = Date.now();
    const body = (await readJson(request, LIMITS.bodyBytes)) as { session?: unknown; noLlm?: unknown };
    // noLlm: plan with Qloo and rules only (used by the server to pre-warm its cache for the examples).
    const noLlm = body?.noLlm === true;
    const session = cleanSession(body?.session);
    const finish = (s: Awaited<ReturnType<typeof planNight>>) => {
      logPlan('plan', started, s.plans[0], s.plans[0] ? picksOf(s.plans[0]).length : 0);
      return trimForClient(s);
    };
    if (request.headers.get('accept')?.includes('application/x-ndjson')) {
      return streamPlan(async (onStep) => finish(await planNight(session, { onStep, noLlm })));
    }
    return NextResponse.json({ session: finish(await planNight(session, { noLlm })) });
  });
}
